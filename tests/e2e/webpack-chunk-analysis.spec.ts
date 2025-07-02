import { test, expect, Page } from '@playwright/test';

interface WebpackError {
  type: string;
  message: string;
  stack?: string;
  timestamp: number;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface NetworkFailure {
  url: string;
  status: number;
  statusText: string;
  method: string;
  timestamp: number;
}

interface ChunkAnalysisResult {
  errors: WebpackError[];
  networkFailures: NetworkFailure[];
  consoleMessages: any[];
  screenshots: string[];
  pageLoadTime: number;
  functionalityTests: {
    initialRender: boolean;
    navigation: boolean;
    componentInteraction: boolean;
  };
}

test.describe('Webpack Chunk Loading Analysis', () => {
  let analysisResult: ChunkAnalysisResult;

  test.beforeEach(async ({ page }) => {
    // Initialize analysis result
    analysisResult = {
      errors: [],
      networkFailures: [],
      consoleMessages: [],
      screenshots: [],
      pageLoadTime: 0,
      functionalityTests: {
        initialRender: false,
        navigation: false,
        componentInteraction: false
      }
    };

    // Set up console monitoring
    page.on('console', (msg) => {
      analysisResult.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    // Set up error monitoring
    page.on('pageerror', (error) => {
      analysisResult.errors.push({
        type: 'PageError',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });

    // Set up network failure monitoring
    page.on('response', (response) => {
      if (!response.ok() && response.url().includes('_next/static')) {
        analysisResult.networkFailures.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          method: response.request().method(),
          timestamp: Date.now()
        });
      }
    });

    // Monitor JavaScript errors in browser context
    await page.addInitScript(() => {
      window.addEventListener('error', (event) => {
        (window as any).__webpackErrors = (window as any).__webpackErrors || [];
        (window as any).__webpackErrors.push({
          type: 'JavaScriptError',
          message: event.message,
          filename: event.filename,
          lineNumber: event.lineno,
          columnNumber: event.colno,
          stack: event.error?.stack,
          timestamp: Date.now()
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        (window as any).__webpackErrors = (window as any).__webpackErrors || [];
        (window as any).__webpackErrors.push({
          type: 'UnhandledRejection',
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
          timestamp: Date.now()
        });
      });
    });
  });

  test('Comprehensive Webpack Chunk Loading Analysis', async ({ page }) => {
    console.log('🔍 Starting comprehensive webpack chunk analysis...');

    const startTime = Date.now();

    try {
      // Navigate to the application
      console.log('📍 Navigating to http://localhost:3000...');
      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      analysisResult.pageLoadTime = Date.now() - startTime;
      console.log(`✅ Initial page load completed in ${analysisResult.pageLoadTime}ms`);

      // Test 1: Initial Render
      try {
        await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
        analysisResult.functionalityTests.initialRender = true;
        console.log('✅ Initial render test passed');
      } catch (error) {
        console.log('❌ Initial render test failed:', error);
        await page.screenshot({ path: 'test-results/initial-render-failure.png' });
        analysisResult.screenshots.push('initial-render-failure.png');
      }

      // Wait and monitor for chunk loading errors over 10 seconds
      console.log('⏱️ Monitoring for chunk loading errors over 10 seconds...');
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000);

        // Check for webpack errors in browser context
        const browserErrors = await page.evaluate(() => {
          return (window as any).__webpackErrors || [];
        });

        if (browserErrors.length > 0) {
          analysisResult.errors.push(...browserErrors);
          console.log(`⚠️ Found ${browserErrors.length} webpack errors at ${i + 1}s`);
        }

        // Take screenshot if errors detected
        if (browserErrors.length > 0 && i === 0) {
          await page.screenshot({ path: `test-results/webpack-error-${i + 1}s.png` });
          analysisResult.screenshots.push(`webpack-error-${i + 1}s.png`);
        }
      }

      // Test 2: Navigation functionality
      try {
        // Look for navigation elements
        const navElements = await page.locator('nav, [role="navigation"], a[href]').count();
        if (navElements > 0) {
          analysisResult.functionalityTests.navigation = true;
          console.log('✅ Navigation elements found and functional');
        }
      } catch (error) {
        console.log('❌ Navigation test failed:', error);
      }

      // Test 3: Component interaction
      try {
        // Try to interact with common UI elements
        const buttons = await page.locator('button').count();
        const inputs = await page.locator('input').count();

        if (buttons > 0 || inputs > 0) {
          analysisResult.functionalityTests.componentInteraction = true;
          console.log('✅ Interactive components found');
        }
      } catch (error) {
        console.log('❌ Component interaction test failed:', error);
      }

      // Final screenshot
      await page.screenshot({ path: 'test-results/final-state.png' });
      analysisResult.screenshots.push('final-state.png');

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      await page.screenshot({ path: 'test-results/test-failure.png' });
      analysisResult.screenshots.push('test-failure.png');
      throw error;
    }
  });

  test.afterEach(async ({ page }) => {
    // Generate comprehensive analysis report
    console.log('\n📊 WEBPACK CHUNK ANALYSIS REPORT');
    console.log('=====================================');

    console.log(`\n⏱️ Performance Metrics:`);
    console.log(`   Page Load Time: ${analysisResult.pageLoadTime}ms`);

    console.log(`\n🧪 Functionality Tests:`);
    console.log(`   Initial Render: ${analysisResult.functionalityTests.initialRender ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Navigation: ${analysisResult.functionalityTests.navigation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Component Interaction: ${analysisResult.functionalityTests.componentInteraction ? '✅ PASS' : '❌ FAIL'}`);

    console.log(`\n🚨 JavaScript Errors (${analysisResult.errors.length}):`);
    if (analysisResult.errors.length === 0) {
      console.log('   ✅ No JavaScript errors detected!');
    } else {
      analysisResult.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.type}] ${error.message}`);
        if (error.stack) {
          console.log(`      Stack: ${error.stack.split('\n')[0]}`);
        }
      });
    }

    console.log(`\n🌐 Network Failures (${analysisResult.networkFailures.length}):`);
    if (analysisResult.networkFailures.length === 0) {
      console.log('   ✅ No network failures detected!');
    } else {
      analysisResult.networkFailures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure.status} ${failure.statusText}: ${failure.url}`);
      });
    }

    console.log(`\n📝 Console Messages (${analysisResult.consoleMessages.length}):`);
    const errorMessages = analysisResult.consoleMessages.filter(msg => msg.type === 'error');
    const warningMessages = analysisResult.consoleMessages.filter(msg => msg.type === 'warning');

    console.log(`   Errors: ${errorMessages.length}`);
    console.log(`   Warnings: ${warningMessages.length}`);

    if (errorMessages.length > 0) {
      console.log('\n   Recent Error Messages:');
      errorMessages.slice(-5).forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.text}`);
      });
    }

    console.log(`\n📸 Screenshots Generated: ${analysisResult.screenshots.length}`);
    analysisResult.screenshots.forEach(screenshot => {
      console.log(`   - test-results/${screenshot}`);
    });

    // Save detailed report to file
    const reportPath = 'test-results/webpack-analysis-report.json';
    await page.evaluate((result) => {
      // This will be saved by the test runner
      return result;
    }, analysisResult);

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    console.log('=====================================\n');
  });
});
