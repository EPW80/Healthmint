// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title HealthDataMarketplace
 * @dev HIPAA-compliant marketplace for health data
 */
contract HealthDataMarketplace is ReentrancyGuard, Pausable, AccessControl {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROVIDER_ROLE = keccak256("PROVIDER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    struct HealthData {
        address payable owner;
        uint256 price;
        string encryptedDataHash; // IPFS hash of encrypted data
        string encryptionKey; // Encrypted symmetric key
        bool isAvailable;
        bool isVerified;
        string category;
        uint256 uploadTime;
        uint256 retentionPeriod; // Data retention period in seconds
        bool consentRequired; // Whether explicit consent is required
        mapping(address => AccessGrant) accessGrants;
        mapping(address => Consent) consents;
    }

    struct AccessGrant {
        bool hasAccess;
        uint256 expirationTime;
        string purpose;
        bool isEmergencyAccess;
    }

    struct Consent {
        bool hasConsented;
        uint256 expirationTime;
        string purpose;
        uint256 timestamp;
    }

    struct User {
        bool isRegistered;
        string role; // "patient", "provider", "researcher"
        string encryptedDetails; // Encrypted user details
        uint256 dataCount;
        uint256 purchaseCount;
        bool hipaaVerified; // HIPAA verification status
        mapping(address => bool) authorizedProviders;
    }

    // Audit trail structure
    struct AuditEntry {
        address user;
        string action;
        uint256 timestamp;
        string details;
    }

    // State variables
    mapping(uint256 => HealthData) public healthData;
    mapping(address => User) public users;
    mapping(uint256 => AuditEntry[]) private dataAuditTrail;
    Counters.Counter private _dataIdCounter;

    uint256 public platformFee;
    uint256 public constant MAX_FEE = 1000; // 10%
    uint256 public constant MIN_RETENTION_PERIOD = 180 days; // 6 months minimum
    uint256 public constant MAX_ACCESS_DURATION = 365 days; // 1 year maximum

    // Events
    event DataListed(
        uint256 indexed id,
        address indexed owner,
        string category
    );
    event DataPurchased(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    event DataVerified(uint256 indexed id, bool verified);
    event UserRegistered(address indexed user, string role);
    event ConsentGranted(
        uint256 indexed id,
        address indexed user,
        string purpose
    );
    event ConsentRevoked(uint256 indexed id, address indexed user);
    event AccessGranted(
        uint256 indexed id,
        address indexed user,
        string purpose,
        uint256 expirationTime
    );
    event AccessRevoked(uint256 indexed id, address indexed user);
    event EmergencyAccessGranted(
        uint256 indexed id,
        address indexed provider,
        string reason
    );
    event AuditEntryAdded(
        uint256 indexed id,
        address indexed user,
        string action
    );
    event DataRetentionUpdated(uint256 indexed id, uint256 newPeriod);

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier validData(uint256 _id) {
        require(_id > 0 && _id <= _dataIdCounter.current(), "Invalid data ID");
        _;
    }

    modifier requiresConsent(uint256 _id) {
        HealthData storage data = healthData[_id];
        if (data.consentRequired && msg.sender != data.owner) {
            require(
                data.consents[msg.sender].hasConsented &&
                    data.consents[msg.sender].expirationTime > block.timestamp,
                "Valid consent required"
            );
        }
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        platformFee = 250; // 2.5%
    }

    function registerUser(
        string memory _role,
        string memory _encryptedDetails
    ) external {
        require(!users[msg.sender].isRegistered, "Already registered");
        require(
            keccak256(abi.encodePacked(_role)) ==
                keccak256(abi.encodePacked("patient")) ||
                keccak256(abi.encodePacked(_role)) ==
                keccak256(abi.encodePacked("provider")) ||
                keccak256(abi.encodePacked(_role)) ==
                keccak256(abi.encodePacked("researcher")),
            "Invalid role"
        );

        users[msg.sender].isRegistered = true;
        users[msg.sender].role = _role;
        users[msg.sender].encryptedDetails = _encryptedDetails;

        if (
            keccak256(abi.encodePacked(_role)) ==
            keccak256(abi.encodePacked("provider"))
        ) {
            _grantRole(PROVIDER_ROLE, msg.sender);
        }

        emit UserRegistered(msg.sender, _role);
        _addAuditEntry(
            0,
            msg.sender,
            "USER_REGISTERED",
            "New user registration"
        );
    }

    function listHealthData(
        string memory _encryptedDataHash,
        string memory _encryptionKey,
        uint256 _price,
        string memory _category,
        uint256 _retentionPeriod,
        bool _consentRequired
    ) external onlyRegistered whenNotPaused {
        require(bytes(_encryptedDataHash).length > 0, "Data hash required");
        require(_price > 0, "Price must be greater than 0");
        require(
            _retentionPeriod >= MIN_RETENTION_PERIOD,
            "Retention period too short"
        );

        _dataIdCounter.increment();
        uint256 newDataId = _dataIdCounter.current();

        HealthData storage newData = healthData[newDataId];
        newData.owner = payable(msg.sender);
        newData.price = _price;
        newData.encryptedDataHash = _encryptedDataHash;
        newData.encryptionKey = _encryptionKey;
        newData.isAvailable = true;
        newData.category = _category;
        newData.uploadTime = block.timestamp;
        newData.retentionPeriod = _retentionPeriod;
        newData.consentRequired = _consentRequired;

        users[msg.sender].dataCount++;

        emit DataListed(newDataId, msg.sender, _category);
        _addAuditEntry(
            newDataId,
            msg.sender,
            "DATA_LISTED",
            "New health data listed"
        );
    }

    function purchaseData(
        uint256 _id,
        string memory _purpose
    )
        external
        payable
        onlyRegistered
        validData(_id)
        requiresConsent(_id)
        whenNotPaused
        nonReentrant
    {
        HealthData storage data = healthData[_id];
        require(data.isAvailable, "Data not available");
        require(msg.value == data.price, "Incorrect payment amount");
        require(msg.sender != data.owner, "Cannot purchase own data");
        require(bytes(_purpose).length > 0, "Purpose required");

        uint256 fee = (msg.value * platformFee) / 10000;
        uint256 sellerAmount = msg.value - fee;

        // Grant access before transfer
        _grantAccess(_id, msg.sender, _purpose, block.timestamp + 30 days);
        users[msg.sender].purchaseCount++;

        // Transfer payments
        data.owner.transfer(sellerAmount);
        payable(getRoleMember(DEFAULT_ADMIN_ROLE, 0)).transfer(fee);

        emit DataPurchased(_id, msg.sender, data.owner, msg.value);
        _addAuditEntry(_id, msg.sender, "DATA_PURCHASED", _purpose);
    }

    function grantConsent(
        uint256 _id,
        string memory _purpose,
        uint256 _duration
    ) external validData(_id) {
        require(_duration <= MAX_ACCESS_DURATION, "Duration too long");

        HealthData storage data = healthData[_id];
        data.consents[msg.sender] = Consent({
            hasConsented: true,
            expirationTime: block.timestamp + _duration,
            purpose: _purpose,
            timestamp: block.timestamp
        });

        emit ConsentGranted(_id, msg.sender, _purpose);
        _addAuditEntry(_id, msg.sender, "CONSENT_GRANTED", _purpose);
    }

    function revokeConsent(uint256 _id) external validData(_id) {
        HealthData storage data = healthData[_id];
        require(data.consents[msg.sender].hasConsented, "No consent to revoke");

        delete data.consents[msg.sender];
        emit ConsentRevoked(_id, msg.sender);
        _addAuditEntry(
            _id,
            msg.sender,
            "CONSENT_REVOKED",
            "Consent revoked by user"
        );
    }

    function requestEmergencyAccess(
        uint256 _id,
        string memory _reason
    ) external validData(_id) {
        require(hasRole(PROVIDER_ROLE, msg.sender), "Not a provider");

        HealthData storage data = healthData[_id];
        _grantAccess(_id, msg.sender, _reason, block.timestamp + 24 hours);
        data.accessGrants[msg.sender].isEmergencyAccess = true;

        emit EmergencyAccessGranted(_id, msg.sender, _reason);
        _addAuditEntry(_id, msg.sender, "EMERGENCY_ACCESS_GRANTED", _reason);
    }

    function verifyData(uint256 _id, bool _verified) external validData(_id) {
        require(hasRole(VERIFIER_ROLE, msg.sender), "Not a verifier");
        healthData[_id].isVerified = _verified;
        emit DataVerified(_id, _verified);
        _addAuditEntry(
            _id,
            msg.sender,
            "DATA_VERIFIED",
            _verified ? "Verified" : "Unverified"
        );
    }

    function _grantAccess(
        uint256 _id,
        address _user,
        string memory _purpose,
        uint256 _expirationTime
    ) private {
        HealthData storage data = healthData[_id];
        data.accessGrants[_user] = AccessGrant({
            hasAccess: true,
            expirationTime: _expirationTime,
            purpose: _purpose,
            isEmergencyAccess: false
        });

        emit AccessGranted(_id, _user, _purpose, _expirationTime);
    }

    function _addAuditEntry(
        uint256 _id,
        address _user,
        string memory _action,
        string memory _details
    ) private {
        dataAuditTrail[_id].push(
            AuditEntry({
                user: _user,
                action: _action,
                timestamp: block.timestamp,
                details: _details
            })
        );

        emit AuditEntryAdded(_id, _user, _action);
    }

    // Admin functions
    function updatePlatformFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= MAX_FEE, "Fee too high");
        platformFee = _newFee;
        _addAuditEntry(0, msg.sender, "FEE_UPDATED", "Platform fee updated");
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        _addAuditEntry(0, msg.sender, "CONTRACT_PAUSED", "Contract paused");
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        _addAuditEntry(0, msg.sender, "CONTRACT_UNPAUSED", "Contract unpaused");
    }

    // View functions
    function getAuditTrail(
        uint256 _id
    ) external view returns (AuditEntry[] memory) {
        require(
            msg.sender == healthData[_id].owner ||
                hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        return dataAuditTrail[_id];
    }

    function checkAccess(
        uint256 _id,
        address _user
    )
        external
        view
        validData(_id)
        returns (
            bool hasAccess,
            uint256 expirationTime,
            string memory purpose,
            bool isEmergencyAccess
        )
    {
        AccessGrant storage grant = healthData[_id].accessGrants[_user];
        return (
            grant.hasAccess && grant.expirationTime > block.timestamp,
            grant.expirationTime,
            grant.purpose,
            grant.isEmergencyAccess
        );
    }
}
