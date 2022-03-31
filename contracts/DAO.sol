// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract DAO {
    address public immutable chairperson;
    IERC20 public token;
    uint public minimumQuorum;
    uint public debatingPeriod;
    uint proposalsCounter;
    uint public testProp;

    enum ProposalStatus {
        inProgress,
        Accepted,
        Rejected
    }

    struct Proposal {
        string description;
        bytes signature;
        address recipient;
        uint endDate;
        ProposalStatus status;
        uint support;
        uint against;
        mapping (address => bool) voters;
    }
    struct VoterInfo {
        uint deposit;
        uint lastProposalEnd;
    }
    mapping (uint => Proposal) public proposals;
    mapping (address => VoterInfo) public voters;

    constructor(address _token, uint _minimumQuorum, uint _debatingPeriod) {
        chairperson = msg.sender;
        token = IERC20(_token);
        minimumQuorum = _minimumQuorum;
        debatingPeriod = _debatingPeriod;
    }

    function addProposal(bytes memory signature, address recipient, string memory description) external returns (uint) {
        require(msg.sender == chairperson, "Not allowed");
        proposalsCounter += 1;
        proposals[proposalsCounter].description = description;
        proposals[proposalsCounter].recipient = recipient;
        proposals[proposalsCounter].signature = signature;
        proposals[proposalsCounter].endDate = block.timestamp + debatingPeriod;
        proposals[proposalsCounter].status = ProposalStatus.inProgress;
        return proposalsCounter;
    }

    function deposit(uint amount) external {
        voters[msg.sender].deposit += amount;
        token.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw() external {
        require(block.timestamp > voters[msg.sender].lastProposalEnd, "Not all proposals you voted are over");
        uint amount = voters[msg.sender].deposit;
        voters[msg.sender].deposit = 0;
        token.transfer(msg.sender, amount);
    }

    function vote(uint id, bool support) external {
        require(voters[msg.sender].deposit > 0, "Deposit tokens");
        require(!proposals[id].voters[msg.sender], "You already voted");

        if (support) {
            proposals[id].support += voters[msg.sender].deposit;
        } else {
            proposals[id].against += voters[msg.sender].deposit;
        }
        if (voters[msg.sender].lastProposalEnd < proposals[id].endDate) {
            voters[msg.sender].lastProposalEnd = proposals[id].endDate;
        }
    }

    function finishProposal(uint id) external {
        Proposal storage proposal = proposals[id];
        require(block.timestamp > proposal.endDate, "Debates are not over");
        if (proposal.support + proposal.against >= minimumQuorum) {
            (bool success, ) = proposal.recipient.call{value: 0}(
                proposal.signature
            );
            require(success, "Not success");
            if (!success) {
                proposal.status = ProposalStatus.Rejected;
            } else {
                proposal.status = ProposalStatus.Accepted;
            }
        } else {
            proposal.status = ProposalStatus.Rejected;
        }
    }

    function forTestCall(uint prop) external {
        // require(msg.sender == chairperson, "Not allowed");
        testProp = prop;
    }
}