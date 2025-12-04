#!/bin/bash

# Test Runner Script
# Runs all test suites and generates comprehensive report

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            VISUAL RECORDER TEST SUITE RUNNER              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Starting test execution..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TOTAL_PASSED=0
TOTAL_FAILED=0

# Create test reports directory
mkdir -p ./test-reports

# Test 1: Integration Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running: Integration Tests (Data Flow & Components)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node tests/integration.test.js
INTEGRATION_EXIT=$?

if [ $INTEGRATION_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Integration tests passed${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ Integration tests failed${NC}"
    ((TOTAL_FAILED++))
fi
echo ""

# Test 2: Edge Cases and Error Handling
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running: Edge Cases & Error Handling Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node tests/edge-cases.test.js
EDGE_EXIT=$?

if [ $EDGE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Edge case tests passed${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ Edge case tests failed${NC}"
    ((TOTAL_FAILED++))
fi
echo ""

# Test 3: Visual Executor Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running: Visual Executor Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node src/modules-client/visual-executor.test.js
VISUAL_EXIT=$?

if [ $VISUAL_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Visual executor tests passed${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ Visual executor tests failed${NC}"
    ((TOTAL_FAILED++))
fi
echo ""

# Final Summary
TOTAL_TESTS=$((TOTAL_PASSED + TOTAL_FAILED))

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                   FINAL TEST SUMMARY                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Test Suites:"
echo "  • Integration Tests:      $([ $INTEGRATION_EXIT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo "  • Edge Case Tests:        $([ $EDGE_EXIT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo "  • Visual Executor Tests:  $([ $VISUAL_EXIT -eq 0 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo ""
echo "───────────────────────────────────────────────────────────"
echo -e "Total Test Suites: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${TOTAL_PASSED}${NC}"
echo -e "Failed: ${RED}${TOTAL_FAILED}${NC}"
echo "───────────────────────────────────────────────────────────"

if [ $TOTAL_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TEST SUITES PASSED!${NC}"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  SOME TEST SUITES FAILED${NC}"
    echo ""
    exit 1
fi
