/**
 * Task 13: Report Generator テスト
 */
import { ReportGenerator, testReportGenerator } from '../src/phase4/report-generator';

console.log('🧪 Running Report Generator Tests...\n');

testReportGenerator()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });
