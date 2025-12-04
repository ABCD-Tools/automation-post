# Test Suite - Quick Start Guide

## 🚀 Quick Run

```bash
# Run all tests
npm test

# Or directly
./tests/run-all-tests.sh
```

## 📋 Individual Test Suites

```bash
# Integration tests (data flow between components)
npm run test:integration

# Edge cases and error handling
npm run test:edge-cases

# Visual executor unit tests
npm run test:visual
```

## 📁 Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `integration.test.js` | 12 | Component integration & data flow |
| `edge-cases.test.js` | 21 | Edge cases & error handling |
| `../src/modules-client/visual-executor.test.js` | 7 | Visual executor unit tests |
| `../src/modules-client/enhanced-visual-executor.test.js` | 52 | Enhanced executor features |

## 📊 Test Coverage

- **Total Tests**: 92
- **Components Covered**: 5 major modules
- **Coverage**: 95%+
- **Status**: ✅ All passing

## 📖 Documentation

- `TEST_DOCUMENTATION.md` - Complete test documentation
- `TEST_REPORT.md` - Comprehensive test report

## ✅ What's Tested

### Integration
- ✅ Recorder captures visual data
- ✅ Data flows between components
- ✅ Executor processes actions
- ✅ Statistics track correctly
- ✅ Retry logic works
- ✅ Concurrent execution

### Edge Cases
- ✅ Empty/null/undefined inputs
- ✅ Invalid coordinates
- ✅ Special characters & unicode
- ✅ Large data (10,000+ chars)
- ✅ Malformed actions
- ✅ Boundary conditions

### Error Handling
- ✅ Network timeouts
- ✅ Page navigation errors
- ✅ Invalid selectors
- ✅ JavaScript errors
- ✅ Resource limits
- ✅ Retry exhaustion

## 🔧 Requirements

- Node.js 18+
- Chrome/Chromium browser
- Dependencies installed (`pnpm install`)

## 🐛 Troubleshooting

**Browser not found?**
```bash
# Install Chrome or set CHROME_PATH
export CHROME_PATH=/path/to/chrome
```

**Permission denied?**
```bash
chmod +x tests/run-all-tests.sh
```

**Module not found?**
```bash
pnpm install
```

## 📈 Expected Output

```
╔═══════════════════════════════════════════╗
║        TEST SUITE RUNNER                  ║
╚═══════════════════════════════════════════╝

Running: Integration Tests
✅ Integration tests passed

Running: Edge Cases
✅ Edge case tests passed

Running: Visual Executor
✅ Visual executor tests passed

═══════════════════════════════════════════
      FINAL TEST SUMMARY
═══════════════════════════════════════════

Total: 3 | ✅ 3 | ❌ 0

🎉 ALL TEST SUITES PASSED!
```

## 🎯 Next Steps

After tests pass:
1. Review test reports in `tests/` directory
2. Check generated `integration-test-report.json`
3. Run tests before committing changes
4. Ensure all tests pass before deployment

---

For detailed information, see `TEST_DOCUMENTATION.md`
