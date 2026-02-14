/**
 * Task 11: Proposal Generator テスト
 */
import { ProposalGenerator, testProposalGenerator } from '../src/phase4/proposal-generator';

console.log('🧪 Running Proposal Generator Tests...\n');

testProposalGenerator()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });
