// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HealthDataMarketplace {
    struct HealthData {
        address payable owner;
        uint256 price;
        string ipfsHash;
        bool isAvailable;
        bool isVerified;
    }

    // State variables
    mapping(uint256 => HealthData) public healthData;
    uint256 public dataCount;
    address public admin;
    uint256 public platformFee; // in basis points (1% = 100)

    // Events
    event DataListed(
        uint256 indexed id,
        address indexed owner,
        uint256 price,
        string ipfsHash
    );
    event DataPurchased(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller
    );
    event DataVerified(uint256 indexed id, bool verified);

    constructor() {
        admin = msg.sender;
        platformFee = 250; // 2.5%
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    function listHealthData(string memory _ipfsHash, uint256 _price) public {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_price > 0, "Price must be greater than 0");

        dataCount++;
        healthData[dataCount] = HealthData({
            owner: payable(msg.sender),
            price: _price,
            ipfsHash: _ipfsHash,
            isAvailable: true,
            isVerified: false
        });

        emit DataListed(dataCount, msg.sender, _price, _ipfsHash);
    }

    function purchaseData(uint256 _id) public payable {
        HealthData storage data = healthData[_id];
        require(data.isAvailable, "Data is not available");
        require(msg.value == data.price, "Incorrect payment amount");
        require(msg.sender != data.owner, "Cannot purchase your own data");

        uint256 fee = (msg.value * platformFee) / 10000;
        uint256 sellerAmount = msg.value - fee;

        data.owner.transfer(sellerAmount);
        payable(admin).transfer(fee);

        emit DataPurchased(_id, msg.sender, data.owner);
    }

    function verifyData(uint256 _id, bool _verified) public onlyAdmin {
        require(_id <= dataCount && _id > 0, "Invalid data ID");
        healthData[_id].isVerified = _verified;
        emit DataVerified(_id, _verified);
    }

    function updatePlatformFee(uint256 _newFee) public onlyAdmin {
        require(_newFee <= 1000, "Fee cannot exceed 10%");
        platformFee = _newFee;
    }

    function getHealthData(
        uint256 _id
    )
        public
        view
        returns (
            address owner,
            uint256 price,
            string memory ipfsHash,
            bool isAvailable,
            bool isVerified
        )
    {
        HealthData storage data = healthData[_id];
        return (
            data.owner,
            data.price,
            data.ipfsHash,
            data.isAvailable,
            data.isVerified
        );
    }
}
