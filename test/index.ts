import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Air, DAO, DAO__factory } from "../typechain";
const abi = [{
    "inputs": [
        {
            "internalType": "uint256",
            "name": "prop",
            "type": "uint256"
        }
    ],
    "name": "forTestCall",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}];

enum ProposalStatus {
    inProgress,
    Accepted,
    Rejected
}

describe('DAO', () => {
    let dao: DAO,
        air: Air,
        owner: SignerWithAddress,
        user1: SignerWithAddress,
        user2: SignerWithAddress,
        snapshot: any;
    const oneHour = 3600;
    const daoInterface = new ethers.utils.Interface(abi);

    before(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        const AirFactory = await ethers.getContractFactory("Air");
        air = await AirFactory.deploy(1000000, "AIR", "AIR");
        await air.deployed();

        const DaoFactory: DAO__factory = await ethers.getContractFactory('DAO');
        dao = await DaoFactory.deploy(air.address, 200000, oneHour);
        await dao.deployed();

        await air.transfer(user1.address, 100000);
        await air.transfer(user2.address, 100000);
        await air.connect(user1).approve(dao.address, 100000);
        await air.connect(user2).approve(dao.address, 100000);

        snapshot = await network.provider.request({
            method: 'evm_snapshot',
            params: [],
        });
    });

    afterEach(async function () {
        await network.provider.request({
            method: 'evm_revert',
            params: [snapshot],
        });

        snapshot = await network.provider.request({
            method: 'evm_snapshot',
            params: [],
        });
    });

    it('should add proposal', async () => {
        const signature = daoInterface.encodeFunctionData('forTestCall', [42]);
        await dao.addProposal(signature, dao.address, 'support my onlyfans');
        const proposal = await dao.proposals(1);

        expect(proposal.description).be.equal('support my onlyfans');
        expect(proposal.status).be.equal(ProposalStatus.inProgress);
        expect(proposal.signature).be.equal(signature);
        expect(proposal.recipient).be.equal(dao.address);
    });

    it('should deposit tokens', async () => {
        await dao.connect(user1).deposit(100000);
        const voterInfo = await dao.voters(user1.address);
        expect(voterInfo.deposit).be.equal(100000);
        expect(await air.balanceOf(user1.address)).be.equal(0);
    });

    it('should withdraw tokens', async () => {
        await dao.connect(user1).deposit(100000);
        await dao.connect(user1).withdraw();
        const voterInfo = await dao.voters(user1.address);
        expect(voterInfo.deposit).be.equal(0);
        expect(await air.balanceOf(user1.address)).be.equal(100000);
    });

    it('should allow to vote', async () => {
        await dao.connect(user1).deposit(100000);
        await dao.connect(user2).deposit(100000);
        const signature = daoInterface.encodeFunctionData('forTestCall', [42]);
        await dao.addProposal(signature, dao.address, 'support my onlyfans');
        await dao.connect(user1).vote(1, true);
        await dao.connect(user2).vote(1, false);

        const proposal = await dao.proposals(1);
        expect(proposal.support).be.equal(100000);
        expect(proposal.against).be.equal(100000);
    });

    it('should finish vote', async () => {
        await dao.connect(user1).deposit(100000);
        await dao.connect(user2).deposit(100000);
        const signature = daoInterface.encodeFunctionData('forTestCall', [42]);
        await dao.addProposal(signature, dao.address, 'build more metro staions');
        await dao.connect(user1).vote(1, true);
        await dao.connect(user2).vote(1, true);

        await network.provider.send('evm_increaseTime', [3600]);
        await network.provider.send('evm_mine');

        await dao.finishProposal(1);
        expect(await dao.testProp()).be.equal(42);
    });
});