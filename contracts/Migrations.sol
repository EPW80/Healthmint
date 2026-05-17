// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Migrations is Ownable, Pausable {
    struct MigrationRecord {
        uint256 completedAt;
        address initiator;
        bytes32 migrationHash;
        bool success;
    }

    mapping(uint256 => MigrationRecord) public migrationHistory;
    uint256 public lastCompletedMigration;
    uint256 public migrationCount;

    // Events for audit trail
    event MigrationCompleted(
        uint256 indexed migrationId,
        address indexed initiator,
        bytes32 migrationHash,
        uint256 timestamp
    );

    event MigrationUpgraded(
        address indexed oldAddress,
        address indexed newAddress,
        uint256 timestamp
    );

    event EmergencyShutdown(
        address indexed initiator,
        string reason,
        uint256 timestamp
    );

    constructor() Ownable() {
        // Initial setup is recorded as migration 0
        _recordMigration(0, keccak256("INITIAL_MIGRATION"));
    }

    function setCompleted(uint256 completed) external onlyOwner whenNotPaused {
        require(completed > lastCompletedMigration, "Invalid migration number");

        // Create unique hash for this migration
        bytes32 migrationHash = keccak256(
            abi.encodePacked(completed, block.timestamp, msg.sender)
        );

        _recordMigration(completed, migrationHash);
    }

    function upgrade(address newAddress) external onlyOwner whenNotPaused {
        require(newAddress != address(0), "Invalid new address");
        require(newAddress != address(this), "Cannot upgrade to self");

        // Ensure new contract is valid
        try Migrations(newAddress).owner() returns (address newOwner) {
            require(newOwner == msg.sender, "Invalid new contract owner");
        } catch {
            revert("Invalid migration contract");
        }

        // Perform upgrade
        Migrations upgraded = Migrations(newAddress);
        upgraded.setCompleted(lastCompletedMigration);

        emit MigrationUpgraded(address(this), newAddress, block.timestamp);
    }

    function _recordMigration(
        uint256 migrationId,
        bytes32 migrationHash
    ) private {
        migrationHistory[migrationId] = MigrationRecord({
            completedAt: block.timestamp,
            initiator: msg.sender,
            migrationHash: migrationHash,
            success: true
        });

        lastCompletedMigration = migrationId;
        migrationCount++;

        emit MigrationCompleted(
            migrationId,
            msg.sender,
            migrationHash,
            block.timestamp
        );
    }
    // Pause and resume functionality
    function getMigrationDetails(
        uint256 migrationId
    )
        external
        view
        returns (
            uint256 completedAt,
            address initiator,
            bytes32 migrationHash,
            bool success
        )
    {
        MigrationRecord memory record = migrationHistory[migrationId];
        require(record.completedAt != 0, "Migration not found");

        return (
            record.completedAt,
            record.initiator,
            record.migrationHash,
            record.success
        );
    }

    // Pause and resume functionality
    function emergencyShutdown(
        string calldata reason
    ) external onlyOwner whenNotPaused {
        _pause();

        emit EmergencyShutdown(msg.sender, reason, block.timestamp);
    }

    // Resume migrations after emergency shutdown
    function resumeMigrations() external onlyOwner whenPaused {
        _unpause();
    }
}
