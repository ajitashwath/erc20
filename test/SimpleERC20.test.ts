import { ethers } from "hardhat";
import { expect } from "chai";
import { EnhancedERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("EnhancedERC20", function () {
    let enhancedERC20: EnhancedERC20;
    let owner: HardhatEthersSigner;
    let addr1: HardhatEthersSigner;
    let addr2: HardhatEthersSigner;
    let addrs: HardhatEthersSigner[];

    const TOKEN_NAME = "Enhanced Token";
    const TOKEN_SYMBOL = "ETK";
    const TOKEN_DECIMALS = 18;
    const INITIAL_SUPPLY = 1000;

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        const EnhancedERC20Factory = await ethers.getContractFactory("EnhancedERC20");
        enhancedERC20 = await EnhancedERC20Factory.deploy(
            TOKEN_NAME, 
            TOKEN_SYMBOL, 
            TOKEN_DECIMALS, 
            INITIAL_SUPPLY
        );
    });

    describe("Deployment", function () {
        it("Should set the right token details", async function () {
            expect(await enhancedERC20.name()).to.equal(TOKEN_NAME);
            expect(await enhancedERC20.symbol()).to.equal(TOKEN_SYMBOL);
            expect(await enhancedERC20.decimals()).to.equal(TOKEN_DECIMALS);
        });

        it("Should set the right owner", async function () {
            expect(await enhancedERC20.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const totalSupply = await enhancedERC20.totalSupply();
            const ownerBalance = await enhancedERC20.balanceOf(owner.address);
            expect(totalSupply).to.equal(ownerBalance);
            expect(totalSupply).to.equal(ethers.parseUnits(INITIAL_SUPPLY.toString(), TOKEN_DECIMALS));
        });

        it("Should not be paused initially", async function () {
            expect(await enhancedERC20.paused()).to.equal(false);
        });
    });

    describe("Transactions", function () {
        it("Should mint tokens to an account", async function () {
            const mintAmount = 100;
            await enhancedERC20.mint(addr1.address, mintAmount);
            
            const addr1Balance = await enhancedERC20.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(mintAmount);
            
            const newTotalSupply = await enhancedERC20.totalSupply();
            const expectedSupply = ethers.parseUnits(INITIAL_SUPPLY.toString(), TOKEN_DECIMALS) + BigInt(mintAmount);
            expect(newTotalSupply).to.equal(expectedSupply);
        });

        it("Should transfer tokens between accounts", async function () {
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
            
            await enhancedERC20.transfer(addr1.address, transferAmount);
            const addr1Balance = await enhancedERC20.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(transferAmount);

            await enhancedERC20.connect(addr1).transfer(addr2.address, transferAmount);
            const addr2Balance = await enhancedERC20.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(transferAmount);
            expect(await enhancedERC20.balanceOf(addr1.address)).to.equal(0);
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const transferAmount = 1;
            await expect(
                enhancedERC20.connect(addr1).transfer(owner.address, transferAmount)
            ).to.be.revertedWith("Transfer amount exceeds balance");
        });
    });

    describe("Allowances", function () {
        it("Should approve tokens for a spender", async function () {
            const approveAmount = 100;
            await enhancedERC20.approve(addr1.address, approveAmount);
            const allowance = await enhancedERC20.allowance(owner.address, addr1.address);
            expect(allowance).to.equal(approveAmount);
        });

        it("Should transfer tokens from another account", async function () {
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
            
            await enhancedERC20.approve(addr1.address, transferAmount);
            await enhancedERC20.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);

            const addr2Balance = await enhancedERC20.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(transferAmount);
        });

        it("Should increase and decrease allowance", async function () {
            const initialAllowance = 100;
            const increaseAmount = 50;
            const decreaseAmount = 25;

            await enhancedERC20.approve(addr1.address, initialAllowance);
            await enhancedERC20.increaseAllowance(addr1.address, increaseAmount);
            
            let allowance = await enhancedERC20.allowance(owner.address, addr1.address);
            expect(allowance).to.equal(initialAllowance + increaseAmount);

            await enhancedERC20.decreaseAllowance(addr1.address, decreaseAmount);
            allowance = await enhancedERC20.allowance(owner.address, addr1.address);
            expect(allowance).to.equal(initialAllowance + increaseAmount - decreaseAmount);
        });
    });

    describe("Owner Functions", function () {
        it("Should allow owner to burn tokens", async function () {
            const burnAmount = ethers.parseUnits("100", TOKEN_DECIMALS);
            const initialSupply = await enhancedERC20.totalSupply();
            const initialBalance = await enhancedERC20.balanceOf(owner.address);

            await enhancedERC20.burn(owner.address, burnAmount);

            const newSupply = await enhancedERC20.totalSupply();
            const newBalance = await enhancedERC20.balanceOf(owner.address);

            expect(newSupply).to.equal(initialSupply - burnAmount);
            expect(newBalance).to.equal(initialBalance - burnAmount);
        });

        it("Should allow owner to transfer ownership", async function () {
            await enhancedERC20.transferOwnership(addr1.address);
            expect(await enhancedERC20.owner()).to.equal(addr1.address);
        });

        it("Should not allow non-owner to mint", async function () {
            await expect(
                enhancedERC20.connect(addr1).mint(addr2.address, 100)
            ).to.be.revertedWith("Caller is not the owner");
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow owner to pause and unpause", async function () {
            await enhancedERC20.pause();
            expect(await enhancedERC20.paused()).to.equal(true);

            await enhancedERC20.unpause();
            expect(await enhancedERC20.paused()).to.equal(false);
        });

        it("Should prevent transfers when paused", async function () {
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
            
            await enhancedERC20.pause();
            
            await expect(
                enhancedERC20.transfer(addr1.address, transferAmount)
            ).to.be.revertedWith("Contract is paused");
        });

        it("Should not allow non-owner to pause", async function () {
            await expect(
                enhancedERC20.connect(addr1).pause()
            ).to.be.revertedWith("Caller is not the owner");
        });
    });

    describe("Blacklist Functionality", function () {
        it("Should allow owner to blacklist and unblacklist accounts", async function () {
            await enhancedERC20.blacklist(addr1.address);
            expect(await enhancedERC20.blacklisted(addr1.address)).to.equal(true);

            await enhancedERC20.unblacklist(addr1.address);
            expect(await enhancedERC20.blacklisted(addr1.address)).to.equal(false);
        });

        it("Should prevent blacklisted accounts from transferring", async function () {
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
            
            // First transfer some tokens to addr1
            await enhancedERC20.transfer(addr1.address, transferAmount);
            
            // Blacklist addr1
            await enhancedERC20.blacklist(addr1.address);
            
            // Try to transfer from blacklisted account
            await expect(
                enhancedERC20.connect(addr1).transfer(addr2.address, transferAmount)
            ).to.be.revertedWith("Account is blacklisted");
        });

        it("Should prevent transfers to blacklisted accounts", async function () {
            const transferAmount = ethers.parseUnits("50", TOKEN_DECIMALS);
            
            await enhancedERC20.blacklist(addr1.address);
            
            await expect(
                enhancedERC20.transfer(addr1.address, transferAmount)
            ).to.be.revertedWith("Account is blacklisted");
        });

        it("Should not allow owner to blacklist themselves", async function () {
            await expect(
                enhancedERC20.blacklist(owner.address)
            ).to.be.revertedWith("Cannot blacklist owner");
        });
    });

    describe("Events", function () {
        it("Should emit Transfer event on mint", async function () {
            const mintAmount = 100;
            await expect(enhancedERC20.mint(addr1.address, mintAmount))
                .to.emit(enhancedERC20, "Transfer")
                .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);
        });

        it("Should emit Paused event", async function () {
            await expect(enhancedERC20.pause())
                .to.emit(enhancedERC20, "Paused")
                .withArgs(owner.address);
        });

        it("Should emit Blacklisted event", async function () {
            await expect(enhancedERC20.blacklist(addr1.address))
                .to.emit(enhancedERC20, "Blacklisted")
                .withArgs(addr1.address);
        });
    });
});