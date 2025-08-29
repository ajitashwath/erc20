import { ethers } from "hardhat";
import { expect } from "chai";
import { ERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC20", function () {
    let erc20: ERC20;
    let owner: HardhatEthersSigner;
    let addr1: HardhatEthersSigner;
    let addr2: HardhatEthersSigner;
    let addr3: HardhatEthersSigner;

    const TOKEN_NAME = "Enhanced Token";
    const TOKEN_SYMBOL = "ETK";
    const TOKEN_DECIMALS = 18;
    const INITIAL_SUPPLY = 1000;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const ERC20Factory = await ethers.getContractFactory("ERC20");
        erc20 = await ERC20Factory.deploy(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOKEN_DECIMALS,
            INITIAL_SUPPLY
        );
    });

    describe("Deployment", function () {
        it("Should set the correct token details", async function () {
            expect(await erc20.name()).to.equal(TOKEN_NAME);
            expect(await erc20.symbol()).to.equal(TOKEN_SYMBOL);
            expect(await erc20.decimals()).to.equal(TOKEN_DECIMALS);
        });

        it("Should set the deployer as owner", async function () {
            expect(await erc20.owner()).to.equal(owner.address);
        });

        it("Should assign total supply to owner", async function () {
            const expectedSupply = ethers.parseUnits(INITIAL_SUPPLY.toString(), TOKEN_DECIMALS);
            const totalSupply = await erc20.totalSupply();
            const ownerBalance = await erc20.balanceOf(owner.address);
            
            expect(totalSupply).to.equal(expectedSupply);
            expect(ownerBalance).to.equal(expectedSupply);
        });

        it("Should not be paused initially", async function () {
            expect(await erc20.paused()).to.equal(false);
        });

        it("Should deploy with zero supply if initial supply is zero", async function () {
            const zeroSupplyToken = await ethers.deployContract("ERC20", [
                "Zero Token",
                "ZTK",
                18,
                0
            ]);

            expect(await zeroSupplyToken.totalSupply()).to.equal(0);
            expect(await zeroSupplyToken.balanceOf(owner.address)).to.equal(0);
        });
    });

    describe("Core ERC20 Functions", function () {
        describe("Transfer", function () {
            it("Should transfer tokens between accounts", async function () {
                const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);

                await expect(erc20.transfer(addr1.address, transferAmount))
                    .to.emit(erc20, "Transfer")
                    .withArgs(owner.address, addr1.address, transferAmount);

                expect(await erc20.balanceOf(addr1.address)).to.equal(transferAmount);
                
                const expectedOwnerBalance = ethers.parseUnits(INITIAL_SUPPLY.toString(), TOKEN_DECIMALS) - transferAmount;
                expect(await erc20.balanceOf(owner.address)).to.equal(expectedOwnerBalance);
            });

            it("Should fail when transferring more than balance", async function () {
                const transferAmount = ethers.parseUnits((INITIAL_SUPPLY + 1).toString(), TOKEN_DECIMALS);
                
                await expect(
                    erc20.transfer(addr1.address, transferAmount)
                ).to.be.revertedWith("Transfer amount exceeds balance");
            });

            it("Should fail when transferring to zero address", async function () {
                await expect(
                    erc20.transfer(ethers.ZeroAddress, 100)
                ).to.be.revertedWith("Transfer to the zero address");
            });

            it("Should allow zero amount transfers", async function () {
                await expect(erc20.transfer(addr1.address, 0))
                    .to.emit(erc20, "Transfer")
                    .withArgs(owner.address, addr1.address, 0);
            });
        });

        describe("Approval", function () {
            it("Should approve tokens for spender", async function () {
                const approveAmount = ethers.parseUnits("100", TOKEN_DECIMALS);

                await expect(erc20.approve(addr1.address, approveAmount))
                    .to.emit(erc20, "Approval")
                    .withArgs(owner.address, addr1.address, approveAmount);

                expect(await erc20.allowance(owner.address, addr1.address)).to.equal(approveAmount);
            });

            it("Should fail when approving zero address", async function () {
                await expect(
                    erc20.approve(ethers.ZeroAddress, 100)
                ).to.be.revertedWith("Approve to the zero address");
            });

            it("Should overwrite previous approvals", async function () {
                const firstApproval = 100;
                const secondApproval = 200;

                await erc20.approve(addr1.address, firstApproval);
                expect(await erc20.allowance(owner.address, addr1.address)).to.equal(firstApproval);

                await erc20.approve(addr1.address, secondApproval);
                expect(await erc20.allowance(owner.address, addr1.address)).to.equal(secondApproval);
            });
        });

        describe("TransferFrom", function () {
            beforeEach(async function () {
                const approveAmount = ethers.parseUnits("100", TOKEN_DECIMALS);
                await erc20.approve(addr1.address, approveAmount);
            });

            it("Should transfer tokens from approved account", async function () {
                const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);

                await expect(
                    erc20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
                ).to.emit(erc20, "Transfer")
                    .withArgs(owner.address, addr2.address, transferAmount);

                expect(await erc20.balanceOf(addr2.address)).to.equal(transferAmount);
                
                const remainingAllowance = ethers.parseUnits("50", TOKEN_DECIMALS);
                expect(await erc20.allowance(owner.address, addr1.address)).to.equal(remainingAllowance);
            });

            it("Should fail when transferring more than allowance", async function () {
                const transferAmount = ethers.parseUnits("150", TOKEN_DECIMALS);

                await expect(
                    erc20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
                ).to.be.revertedWith("Insufficient allowance");
            });

            it("Should not decrease allowance when set to max uint256", async function () {
                const maxAllowance = ethers.MaxUint256;
                await erc20.approve(addr1.address, maxAllowance);

                const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
                await erc20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);

                expect(await erc20.allowance(owner.address, addr1.address)).to.equal(maxAllowance);
            });
        });

        describe("Allowance Utilities", function () {
            it("Should increase allowance", async function () {
                const initialAllowance = 100;
                const increaseAmount = 50;

                await erc20.approve(addr1.address, initialAllowance);
                
                await expect(erc20.increaseAllowance(addr1.address, increaseAmount))
                    .to.emit(erc20, "Approval")
                    .withArgs(owner.address, addr1.address, initialAllowance + increaseAmount);

                expect(await erc20.allowance(owner.address, addr1.address))
                    .to.equal(initialAllowance + increaseAmount);
            });

            it("Should decrease allowance", async function () {
                const initialAllowance = 100;
                const decreaseAmount = 30;

                await erc20.approve(addr1.address, initialAllowance);
                
                await expect(erc20.decreaseAllowance(addr1.address, decreaseAmount))
                    .to.emit(erc20, "Approval")
                    .withArgs(owner.address, addr1.address, initialAllowance - decreaseAmount);

                expect(await erc20.allowance(owner.address, addr1.address))
                    .to.equal(initialAllowance - decreaseAmount);
            });

            it("Should fail when decreasing allowance below zero", async function () {
                const initialAllowance = 100;
                const decreaseAmount = 150;

                await erc20.approve(addr1.address, initialAllowance);

                await expect(
                    erc20.decreaseAllowance(addr1.address, decreaseAmount)
                ).to.be.revertedWith("Decreased allowance below zero");
            });
        });
    });

    describe("Owner Functions", function () {
        describe("Minting", function () {
            it("Should allow owner to mint tokens", async function () {
                const mintAmount = ethers.parseUnits("500", TOKEN_DECIMALS);
                const initialSupply = await erc20.totalSupply();

                await expect(erc20.mint(addr1.address, mintAmount))
                    .to.emit(erc20, "Transfer")
                    .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

                expect(await erc20.balanceOf(addr1.address)).to.equal(mintAmount);
                expect(await erc20.totalSupply()).to.equal(initialSupply + mintAmount);
            });

            it("Should not allow minting to zero address", async function () {
                await expect(
                    erc20.mint(ethers.ZeroAddress, 100)
                ).to.be.revertedWith("Mint to the zero address");
            });

            it("Should not allow minting to blacklisted account", async function () {
                await erc20.blacklist(addr1.address);

                await expect(
                    erc20.mint(addr1.address, 100)
                ).to.be.revertedWith("Cannot mint to blacklisted account");
            });

            it("Should not allow non-owner to mint", async function () {
                await expect(
                    erc20.connect(addr1).mint(addr2.address, 100)
                ).to.be.revertedWith("Caller is not the owner");
            });
        });

        describe("Burning", function () {
            it("Should allow owner to burn tokens", async function () {
                const burnAmount = ethers.parseUnits("100", TOKEN_DECIMALS);
                const initialSupply = await erc20.totalSupply();
                const initialBalance = await erc20.balanceOf(owner.address);

                await expect(erc20.burn(owner.address, burnAmount))
                    .to.emit(erc20, "Transfer")
                    .withArgs(owner.address, ethers.ZeroAddress, burnAmount);

                expect(await erc20.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
                expect(await erc20.totalSupply()).to.equal(initialSupply - burnAmount);
            });

            it("Should not allow burning from zero address", async function () {
                await expect(
                    erc20.burn(ethers.ZeroAddress, 100)
                ).to.be.revertedWith("Burn from the zero address");
            });

            it("Should not allow burning more than balance", async function () {
                const balance = await erc20.balanceOf(addr1.address);
                const burnAmount = balance + 1n;

                await expect(
                    erc20.burn(addr1.address, burnAmount)
                ).to.be.revertedWith("Burn amount exceeds balance");
            });

            it("Should not allow non-owner to burn", async function () {
                await expect(
                    erc20.connect(addr1).burn(owner.address, 100)
                ).to.be.revertedWith("Caller is not the owner");
            });
        });

        describe("Ownership Transfer", function () {
            it("Should transfer ownership", async function () {
                await expect(erc20.transferOwnership(addr1.address))
                    .to.emit(erc20, "OwnershipTransferred")
                    .withArgs(owner.address, addr1.address);

                expect(await erc20.owner()).to.equal(addr1.address);
            });

            it("Should not allow transferring to zero address", async function () {
                await expect(
                    erc20.transferOwnership(ethers.ZeroAddress)
                ).to.be.revertedWith("New owner is the zero address");
            });

            it("Should not allow non-owner to transfer ownership", async function () {
                await expect(
                    erc20.connect(addr1).transferOwnership(addr2.address)
                ).to.be.revertedWith("Caller is not the owner");
            });
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow owner to pause contract", async function () {
            await expect(erc20.pause())
                .to.emit(erc20, "Paused")
                .withArgs(owner.address);

            expect(await erc20.paused()).to.equal(true);
        });

        it("Should allow owner to unpause contract", async function () {
            await erc20.pause();

            await expect(erc20.unpause())
                .to.emit(erc20, "Unpaused")
                .withArgs(owner.address);

            expect(await erc20.paused()).to.equal(false);
        });

        it("Should prevent transfers when paused", async function () {
            await erc20.pause();
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);

            await expect(
                erc20.transfer(addr1.address, transferAmount)
            ).to.be.revertedWith("Contract is paused");
        });

        it("Should prevent transferFrom when paused", async function () {
            const approveAmount = ethers.parseUnits("100", TOKEN_DECIMALS);
            await erc20.approve(addr1.address, approveAmount);
            await erc20.pause();

            await expect(
                erc20.connect(addr1).transferFrom(owner.address, addr2.address, 50)
            ).to.be.revertedWith("Contract is paused");
        });

        it("Should prevent approvals when paused", async function () {
            await erc20.pause();

            await expect(
                erc20.approve(addr1.address, 100)
            ).to.be.revertedWith("Contract is paused");
        });

        it("Should not allow non-owner to pause", async function () {
            await expect(
                erc20.connect(addr1).pause()
            ).to.be.revertedWith("Caller is not the owner");
        });

        it("Should not allow non-owner to unpause", async function () {
            await erc20.pause();

            await expect(
                erc20.connect(addr1).unpause()
            ).to.be.revertedWith("Caller is not the owner");
        });
    });

    describe("Blacklist Functionality", function () {
        it("Should allow owner to blacklist account", async function () {
            await expect(erc20.blacklist(addr1.address))
                .to.emit(erc20, "Blacklisted")
                .withArgs(addr1.address);

            expect(await erc20.blacklisted(addr1.address)).to.equal(true);
        });

        it("Should allow owner to unblacklist account", async function () {
            await erc20.blacklist(addr1.address);

            await expect(erc20.unblacklist(addr1.address))
                .to.emit(erc20, "Unblacklisted")
                .withArgs(addr1.address);

            expect(await erc20.blacklisted(addr1.address)).to.equal(false);
        });

        it("Should prevent blacklisted accounts from sending transfers", async function () {
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
            await erc20.transfer(addr1.address, transferAmount);
            await erc20.blacklist(addr1.address);

            await expect(
                erc20.connect(addr1).transfer(addr2.address, transferAmount)
            ).to.be.revertedWith("Account is blacklisted");
        });

        it("Should prevent transfers to blacklisted accounts", async function () {
            await erc20.blacklist(addr1.address);
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);

            await expect(
                erc20.transfer(addr1.address, transferAmount)
            ).to.be.revertedWith("Account is blacklisted");
        });

        it("Should prevent blacklisted accounts in transferFrom (from)", async function () {
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
            await erc20.transfer(addr1.address, transferAmount);
            await erc20.connect(addr1).approve(addr2.address, transferAmount);
            await erc20.blacklist(addr1.address);

            await expect(
                erc20.connect(addr2).transferFrom(addr1.address, addr3.address, transferAmount)
            ).to.be.revertedWith("Account is blacklisted");
        });

        it("Should prevent blacklisted accounts in transferFrom (to)", async function () {
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
            await erc20.approve(addr1.address, transferAmount);
            await erc20.blacklist(addr2.address);

            await expect(
                erc20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
            ).to.be.revertedWith("Account is blacklisted");
        });

        it("Should not allow blacklisting zero address", async function () {
            await expect(
                erc20.blacklist(ethers.ZeroAddress)
            ).to.be.revertedWith("Cannot blacklist zero address");
        });

        it("Should not allow owner to blacklist themselves", async function () {
            await expect(
                erc20.blacklist(owner.address)
            ).to.be.revertedWith("Cannot blacklist owner");
        });

        it("Should not allow non-owner to blacklist", async function () {
            await expect(
                erc20.connect(addr1).blacklist(addr2.address)
            ).to.be.revertedWith("Caller is not the owner");
        });

        it("Should not allow non-owner to unblacklist", async function () {
            await erc20.blacklist(addr1.address);

            await expect(
                erc20.connect(addr1).unblacklist(addr1.address)
            ).to.be.revertedWith("Caller is not the owner");
        });
    });

    describe("Edge Cases and Integration", function () {
        it("Should handle multiple modifiers correctly", async function () {
            // Test paused + blacklisted
            await erc20.blacklist(addr1.address);
            await erc20.pause();

            await expect(
                erc20.transfer(addr1.address, 100)
            ).to.be.revertedWith("Contract is paused");
        });

        it("Should work correctly after ownership transfer", async function () {
            await erc20.transferOwnership(addr1.address);

            await expect(
                erc20.mint(addr2.address, 100)
            ).to.be.revertedWith("Caller is not the owner");

            await expect(erc20.connect(addr1).mint(addr2.address, 100))
                .to.emit(erc20, "Transfer");
        });

        it("Should handle large token amounts", async function () {
            const largeAmount = ethers.parseUnits("1000000", TOKEN_DECIMALS);
            await erc20.mint(addr1.address, largeAmount);

            expect(await erc20.balanceOf(addr1.address)).to.equal(largeAmount);
        });

        it("Should maintain correct total supply through mint and burn", async function () {
            const initialSupply = await erc20.totalSupply();
            const mintAmount = ethers.parseUnits("500", TOKEN_DECIMALS);
            const burnAmount = ethers.parseUnits("200", TOKEN_DECIMALS);

            await erc20.mint(addr1.address, mintAmount);
            expect(await erc20.totalSupply()).to.equal(initialSupply + mintAmount);

            await erc20.burn(addr1.address, burnAmount);
            expect(await erc20.totalSupply()).to.equal(initialSupply + mintAmount - burnAmount);
        });
    });
});