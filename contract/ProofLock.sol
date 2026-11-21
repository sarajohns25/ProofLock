
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProofLock {
    struct Record {
        address owner;
        uint256 timestamp;
    }

    mapping(bytes32 => Record) private records;

    event Sealed(
        bytes32 indexed fileHash,
        address indexed owner,
        uint256 timestamp
    );

    function seal(bytes32 fileHash) external {
        require(records[fileHash].timestamp == 0, "Already sealed");

        records[fileHash] = Record(msg.sender, block.timestamp);

        emit Sealed(fileHash, msg.sender, block.timestamp);
    }

    function verify(bytes32 fileHash)
        external
        view
        returns (bool exists, address owner, uint256 timestamp)
    {
        Record memory r = records[fileHash];

        return (r.timestamp != 0, r.owner, r.timestamp);
    }
}
