// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MantleUSD} from "../src/avs/MantleUSD.sol";
import {INMergAVS} from "../src/avs/INMergAVS.sol";
import {IssuesClaimWithAVS} from "../src/avs/IssuesClaimWithAVS.sol";

/**
 * @title DeployAVS
 * @notice Deployment script for iNMerg AVS system with mUSD token
 */
contract DeployAVS is Script {
    function run() external {
        // Get configuration from environment
        address validator = vm.envOr("VALIDATOR_ADDRESS", address(0x1));
        uint256 minimumStake = vm.envOr("MINIMUM_STAKE", uint256(100 * 10**18)); // 100 mUSD
        
        console2.log("===========================================");
        console2.log("Deploying iNMerg AVS System with mUSD");
        console2.log("===========================================");
        console2.log("Validator Address:", validator);
        console2.log("Minimum Stake:", minimumStake);
        console2.log("");
        
        vm.startBroadcast();
        
        // 1. Deploy MantleUSD token
        console2.log("1. Deploying MantleUSD token...");
        MantleUSD mUSD = new MantleUSD();
        console2.log("   MantleUSD deployed at:", address(mUSD));
        console2.log("   Initial supply:", mUSD.totalSupply() / 10**18, "mUSD");
        
        // 2. Deploy IssuesClaimWithAVS (without AVS address first)
        console2.log("");
        console2.log("2. Deploying IssuesClaimWithAVS...");
        IssuesClaimWithAVS issuesClaim = new IssuesClaimWithAVS(
            validator,
            address(mUSD),
            address(0) // Will update later
        );
        console2.log("   IssuesClaimWithAVS deployed at:", address(issuesClaim));
        
        // 3. Deploy INMergAVS
        console2.log("3. Deploying INMergAVS...");
        INMergAVS avs = new INMergAVS(
            address(issuesClaim),
            address(mUSD),
            minimumStake
        );
        console2.log("   INMergAVS deployed at:", address(avs));
        
        // 4. Update AVS address in IssuesClaim
        console2.log("");
        console2.log("4. Linking contracts...");
        issuesClaim.updateAVSContract(address(avs));
        console2.log("   Contracts linked successfully");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console2.log("");
        console2.log("===========================================");
        console2.log("Deployment Summary");
        console2.log("===========================================");
        console2.log("MantleUSD (mUSD):", address(mUSD));
        console2.log("IssuesClaimWithAVS:", address(issuesClaim));
        console2.log("INMergAVS:", address(avs));
        console2.log("Validator:", validator);
        console2.log("Minimum Stake:", minimumStake / 10**18, "mUSD");
        console2.log("");
        console2.log("Next Steps:");
        console2.log("1. Update .env with contract addresses");
        console2.log("2. Get mUSD tokens for staking");
        console2.log("3. Approve mUSD spending: mUSD.approve(AVS_ADDRESS, amount)");
        console2.log("4. Register as operator: npm run register");
        console2.log("5. Start operator bot: npm start");
        console2.log("===========================================");
    }
}
