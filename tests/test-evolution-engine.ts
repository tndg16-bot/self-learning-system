/**
 * Task 12: Evolution Engine テスト
 */
import { EvolutionEngine, testEvolutionEngine } from '../src/phase4/evolution-engine';

console.log('🧪 Running Evolution Engine Tests...\n');

testEvolutionEngine()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });
