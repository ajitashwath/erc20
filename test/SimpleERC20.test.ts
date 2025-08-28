import { ethers } from "hardhat";
import { expect } from "chai";
import { SimpleERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimpleERC20", function () {
    let simpleERC20: SimpleERC20;
    let owner: HardhatEthersSigner;
    let addr1: HardhatEthersSigner;
    let addr2: HardhatEthersSigner;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const simpleERC20Factory = await ethers.getContractFactory("SimpleERC20");
        simpleERC20 = await simpleERC20Factory.deploy("SimpleToken", "STK", 18);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await simpleERC20.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await simpleERC20.balanceOf(owner.address);
            expect(await simpleERC20.totalSupply()).to.equal(ownerBalance);
        });
    });

    describe("Transactions", function () {
        it("Should mint tokens to an account", async function () {
            await simpleERC20.mint(addr1.address, 100);
            const addr1Balance = await simpleERC20.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(100);
        });

        it("Should transfer tokens between accounts", async function () {
            await simpleERC20.mint(owner.address, 100);
            
            await simpleERC20.transfer(addr1.address, 50);
            const addr1Balance = await simpleERC20.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(50);

            await simpleERC20.connect(addr1).transfer(addr2.address, 50);
            const addr2Balance = await simpleERC20.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });

        it("Should fail if sender doesn’t have enough tokens", async function () {
            const initialOwnerBalance = await simpleERC20.balanceOf(owner.address);

            await expect(
                simpleERC20.connect(addr1).transfer(owner.address, 1)
            ).to.be.revertedWith("SimpleERC20: transfer amount exceeds balance");

            expect(await simpleERC20.balanceOf(owner.address)).to.equal(
                initialOwnerBalance
            );
        });
    });

    describe("Allowances", function () {
        it("Should approve tokens for a spender", async function () {
            await simpleERC20.approve(addr1.address, 100);
            const allowance = await simpleERC20.allowance(owner.address, addr1.address);
            expect(allowance).to.equal(100);
        });

        it("Should transfer tokens from another account", async function () {
            await simpleERC20.mint(owner.address, 100);
            await simpleERC20.approve(addr1.address, 50);
            await simpleERC20.connect(addr1).transferFrom(owner.address, addr2.address, 50);

            const addr2Balance = await simpleERC20.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });

        it("Should fail to transfer tokens from another account with insufficient allowance", async function () {
            await simpleERC20.mint(owner.address, 100);
            await simpleERC20.approve(addr1.address, 40);
            
            await expect(
                simpleERC20.connect(addr1).transferFrom(owner.address, addr2.address, 50)
            ).to.be.revertedWith("SimpleERC20: insufficient allowance");
        });
    });
});