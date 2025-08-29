const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const TOKEN_NAME = "Enhanced Token";
  const TOKEN_SYMBOL = "ETK";
  const TOKEN_DECIMALS = 18;
  const INITIAL_SUPPLY = 1000000;

  const ERC20 = await hre.ethers.getContractFactory("ERC20");
  console.log("\nDeploying ERC20 token...");
  
  const erc20 = await ERC20.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOKEN_DECIMALS,
    INITIAL_SUPPLY
  );

  await erc20.waitForDeployment();
  
  const contractAddress = await erc20.getAddress();
  console.log(`ERC20 token deployed to: ${contractAddress}`);
  
  console.log("\nToken Information:");
  console.log(`Name: ${await erc20.name()}`);
  console.log(`Symbol: ${await erc20.symbol()}`);
  console.log(`Decimals: ${await erc20.decimals()}`);
  console.log(`Total Supply: ${ethers.formatUnits(await erc20.totalSupply(), TOKEN_DECIMALS)} ${TOKEN_SYMBOL}`);
  console.log(`Owner: ${await erc20.owner()}`);
  console.log(`Owner Balance: ${ethers.formatUnits(await erc20.balanceOf(deployer.address), TOKEN_DECIMALS)} ${TOKEN_SYMBOL}`);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await erc20.deploymentTransaction().wait(6);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, INITIAL_SUPPLY],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }

  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });