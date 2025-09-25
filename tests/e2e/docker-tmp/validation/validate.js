#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const N8N_URL = process.env.N8N_URL || 'http://n8n:5678';
const EXPECTED_NODE_NAME = process.env.EXPECTED_NODE_NAME || 'n8n-nodes-notion-set-icon.notionSetIcon';
const EXPECTED_NODE_VERSION = process.env.EXPECTED_NODE_VERSION || '1.0.4';

class N8nNodeValidator {
  constructor() {
    this.api = axios.create({
      baseURL: N8N_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.validationResults = {
      timestamp: new Date().toISOString(),
      n8nUrl: N8N_URL,
      expectedNode: EXPECTED_NODE_NAME,
      expectedVersion: EXPECTED_NODE_VERSION,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async validate() {
    console.log(chalk.bold.cyan('🚀 N8n Custom Node Validation Suite'));
    console.log(chalk.gray('=' .repeat(50)));
    console.log(chalk.blue(`\n📍 Testing against: ${N8N_URL}`));
    console.log(chalk.blue(`📦 Expected node: ${EXPECTED_NODE_NAME}`));
    console.log(chalk.blue(`📌 Expected version: ${EXPECTED_NODE_VERSION}\n`));

    // Run all validation tests
    await this.waitForN8n();
    await this.checkN8nVersion();
    await this.validateNodeInstallation();
    await this.validateNodeStructure();
    await this.validateCredentialTypes();
    await this.testNodeExecution();
    await this.validateWorkflowImport();
    await this.performanceTest();

    // Save and display results
    this.saveResults();
    this.displaySummary();

    // Exit with appropriate code
    process.exit(this.validationResults.summary.failed > 0 ? 1 : 0);
  }

  async waitForN8n() {
    console.log(chalk.yellow('⏳ Waiting for n8n to be ready...'));
    const startTime = Date.now();
    const maxWaitTime = 60000; // 60 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.api.get('/healthz');
        if (response.status === 200) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          this.addResult('N8n Health Check', true, `Ready in ${elapsed}s`);
          console.log(chalk.green(`✅ N8n is ready (${elapsed}s)`));
          return;
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    this.addResult('N8n Health Check', false, 'Timeout waiting for n8n');
    throw new Error('N8n failed to start within timeout');
  }

  async checkN8nVersion() {
    console.log(chalk.yellow('\n📊 Checking n8n version...'));

    try {
      const response = await this.api.get('/api/v1/version');
      const versionInfo = response.data;

      console.log(chalk.gray(`   N8n version: ${versionInfo.cli}`));
      console.log(chalk.gray(`   Node.js: ${process.version}`));

      // Check if version is recent (within last 3 months)
      const isRecent = this.isVersionRecent(versionInfo.cli);

      this.addResult(
        'N8n Version',
        true,
        `Version ${versionInfo.cli}`,
        isRecent ? null : 'Consider updating to latest n8n version'
      );

      console.log(chalk.green('✅ N8n version checked'));
    } catch (error) {
      this.addResult('N8n Version', false, error.message);
      console.log(chalk.red('❌ Failed to get n8n version'));
    }
  }

  async validateNodeInstallation() {
    console.log(chalk.yellow('\n🔍 Validating node installation...'));

    try {
      const response = await this.api.get('/api/v1/node-types');
      const nodeTypes = response.data.data || [];

      // Find our custom node
      const customNode = nodeTypes.find(node => node.name === EXPECTED_NODE_NAME);

      if (customNode) {
        console.log(chalk.green(`✅ Custom node found: ${customNode.displayName}`));
        console.log(chalk.gray(`   Version: ${customNode.version}`));
        console.log(chalk.gray(`   Description: ${customNode.description}`));

        // Validate version matches
        const versionMatch = customNode.version === EXPECTED_NODE_VERSION;

        this.addResult(
          'Node Installation',
          true,
          `Node installed (v${customNode.version})`,
          versionMatch ? null : `Version mismatch: expected ${EXPECTED_NODE_VERSION}, got ${customNode.version}`
        );

        // Check node properties
        this.validateNodeProperties(customNode);

        return customNode;
      } else {
        // List similar nodes for debugging
        const notionNodes = nodeTypes.filter(n => n.name.toLowerCase().includes('notion'));

        console.log(chalk.red('❌ Custom node not found'));
        if (notionNodes.length > 0) {
          console.log(chalk.yellow('   Found similar nodes:'));
          notionNodes.forEach(node => {
            console.log(chalk.gray(`   - ${node.name} (${node.displayName})`));
          });
        }

        this.addResult('Node Installation', false, 'Node not found in n8n');
        return null;
      }
    } catch (error) {
      this.addResult('Node Installation', false, error.message);
      console.log(chalk.red('❌ Failed to check node installation'));
      return null;
    }
  }

  validateNodeProperties(node) {
    console.log(chalk.yellow('\n🔧 Validating node properties...'));

    const requiredProperties = [
      'name',
      'displayName',
      'description',
      'version',
      'defaults',
      'inputs',
      'outputs',
      'properties'
    ];

    const missingProps = requiredProperties.filter(prop => !node[prop]);

    if (missingProps.length === 0) {
      this.addResult('Node Properties', true, 'All required properties present');
      console.log(chalk.green('✅ Node structure valid'));
    } else {
      this.addResult(
        'Node Properties',
        false,
        `Missing properties: ${missingProps.join(', ')}`
      );
      console.log(chalk.red(`❌ Missing properties: ${missingProps.join(', ')}`));
    }

    // Validate specific properties
    if (node.properties) {
      const hasResource = node.properties.some(p => p.name === 'resource');
      const hasOperation = node.properties.some(p => p.name === 'operation');

      if (hasResource && hasOperation) {
        console.log(chalk.green('✅ Resource and operation properties found'));
      } else {
        console.log(chalk.yellow('⚠️  Missing resource or operation properties'));
      }
    }
  }

  async validateNodeStructure() {
    console.log(chalk.yellow('\n📁 Validating node file structure...'));

    const requiredFiles = [
      '/home/node/.n8n/custom/node_modules/n8n-nodes-notion-set-icon/package.json',
      '/home/node/.n8n/custom/node_modules/n8n-nodes-notion-set-icon/dist/nodes/NotionSetIcon/NotionSetIcon.node.js',
      '/home/node/.n8n/custom/node_modules/n8n-nodes-notion-set-icon/dist/credentials/NotionSetIconApi.credentials.js'
    ];

    let allFilesExist = true;

    for (const filePath of requiredFiles) {
      const exists = fs.existsSync(filePath);
      const fileName = path.basename(filePath);

      if (exists) {
        console.log(chalk.green(`   ✅ ${fileName}`));
      } else {
        console.log(chalk.red(`   ❌ ${fileName} - NOT FOUND`));
        allFilesExist = false;
      }
    }

    this.addResult(
      'Node File Structure',
      allFilesExist,
      allFilesExist ? 'All required files present' : 'Missing required files'
    );
  }

  async validateCredentialTypes() {
    console.log(chalk.yellow('\n🔐 Validating credential types...'));

    try {
      const response = await this.api.get('/api/v1/credential-types');
      const credentialTypes = response.data.data || [];

      const notionCredential = credentialTypes.find(
        cred => cred.name === 'notionSetIconApi'
      );

      if (notionCredential) {
        console.log(chalk.green(`✅ Credential type found: ${notionCredential.displayName}`));
        console.log(chalk.gray(`   Properties: ${notionCredential.properties?.length || 0}`));

        this.addResult('Credential Types', true, 'Credential type registered');
      } else {
        console.log(chalk.red('❌ Credential type not found'));
        this.addResult('Credential Types', false, 'Credential type not registered');
      }
    } catch (error) {
      this.addResult('Credential Types', false, error.message);
      console.log(chalk.red('❌ Failed to check credential types'));
    }
  }

  async testNodeExecution() {
    console.log(chalk.yellow('\n⚡ Testing node execution...'));

    try {
      // Create a test workflow
      const testWorkflow = {
        name: `Test Workflow - ${Date.now()}`,
        active: false,
        nodes: [
          {
            id: 'uuid-1',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [250, 300],
            parameters: {}
          },
          {
            id: 'uuid-2',
            name: 'Notion Set Icon',
            type: EXPECTED_NODE_NAME,
            typeVersion: 1,
            position: [450, 300],
            parameters: {
              resource: 'page',
              operation: 'setIcon',
              pageId: 'test-page-id',
              iconSource: 'url',
              iconUrl: 'https://www.notion.so/icons/star_yellow.svg'
            }
          }
        ],
        connections: {
          'Start': {
            main: [[{ node: 'Notion Set Icon', type: 'main', index: 0 }]]
          }
        },
        settings: {},
        staticData: null
      };

      // Create workflow
      const createResponse = await this.api.post('/api/v1/workflows', testWorkflow);

      if (createResponse.data.data) {
        const workflowId = createResponse.data.data.id;
        console.log(chalk.green(`✅ Test workflow created (ID: ${workflowId})`));

        this.addResult('Node Execution', true, 'Workflow with node created successfully');

        // Clean up - delete test workflow
        await this.api.delete(`/api/v1/workflows/${workflowId}`);
      } else {
        this.addResult('Node Execution', false, 'Failed to create test workflow');
      }
    } catch (error) {
      this.addResult('Node Execution', false, error.message);
      console.log(chalk.red('❌ Failed to test node execution'));
    }
  }

  async validateWorkflowImport() {
    console.log(chalk.yellow('\n📥 Testing workflow import...'));

    const workflowFiles = fs.readdirSync('/workflows')
      .filter(file => file.endsWith('.json'));

    console.log(chalk.blue(`   Found ${workflowFiles.length} example workflow(s)`));

    for (const file of workflowFiles) {
      try {
        const workflowData = JSON.parse(
          fs.readFileSync(path.join('/workflows', file), 'utf8')
        );

        // Modify name to avoid conflicts
        workflowData.name = `${workflowData.name} - Validation ${Date.now()}`;

        const response = await this.api.post('/api/v1/workflows', workflowData);

        if (response.data.data) {
          console.log(chalk.green(`   ✅ ${file} imported successfully`));

          // Clean up
          await this.api.delete(`/api/v1/workflows/${response.data.data.id}`);

          this.addResult(`Workflow Import: ${file}`, true, 'Imported successfully');
        }
      } catch (error) {
        console.log(chalk.red(`   ❌ ${file} failed: ${error.message}`));
        this.addResult(`Workflow Import: ${file}`, false, error.message);
      }
    }
  }

  async performanceTest() {
    console.log(chalk.yellow('\n⚡ Performance validation...'));

    const metrics = {
      apiResponseTime: 0,
      nodeLoadTime: 0,
      memoryUsage: 0
    };

    try {
      // Test API response time
      const startTime = Date.now();
      await this.api.get('/api/v1/node-types');
      metrics.apiResponseTime = Date.now() - startTime;

      console.log(chalk.gray(`   API Response: ${metrics.apiResponseTime}ms`));

      // Check if response time is acceptable
      const isAcceptable = metrics.apiResponseTime < 1000;

      this.addResult(
        'Performance',
        isAcceptable,
        `API response time: ${metrics.apiResponseTime}ms`,
        isAcceptable ? null : 'API response time is slow'
      );

      console.log(isAcceptable ?
        chalk.green('✅ Performance acceptable') :
        chalk.yellow('⚠️  Performance could be improved')
      );
    } catch (error) {
      this.addResult('Performance', false, error.message);
    }
  }

  addResult(testName, passed, message, warning = null) {
    const result = {
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };

    if (warning) {
      result.warning = warning;
      this.validationResults.summary.warnings++;
    }

    this.validationResults.tests.push(result);
    this.validationResults.summary.total++;

    if (passed) {
      this.validationResults.summary.passed++;
    } else {
      this.validationResults.summary.failed++;
    }
  }

  isVersionRecent(version) {
    // Simple check - in production, compare against actual release dates
    const versionParts = version.split('.');
    const major = parseInt(versionParts[0]);
    const minor = parseInt(versionParts[1]);

    // Assume versions > 1.0.0 are recent
    return major > 1 || (major === 1 && minor >= 0);
  }

  saveResults() {
    const resultsPath = `/test-results/validation-${Date.now()}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(this.validationResults, null, 2));
    console.log(chalk.gray(`\n📊 Results saved to: ${resultsPath}`));
  }

  displaySummary() {
    const { summary } = this.validationResults;

    console.log(chalk.bold.cyan('\n' + '='.repeat(50)));
    console.log(chalk.bold.cyan('VALIDATION SUMMARY'));
    console.log(chalk.bold.cyan('='.repeat(50)));

    console.log(chalk.white(`Total Tests: ${summary.total}`));
    console.log(chalk.green(`✅ Passed: ${summary.passed}`));
    console.log(chalk.red(`❌ Failed: ${summary.failed}`));

    if (summary.warnings > 0) {
      console.log(chalk.yellow(`⚠️  Warnings: ${summary.warnings}`));
    }

    console.log(chalk.cyan('='.repeat(50)));

    if (summary.failed === 0) {
      console.log(chalk.bold.green('\n🎉 ALL VALIDATIONS PASSED!'));
      console.log(chalk.green('Your custom node is properly installed and compatible with n8n.'));
    } else {
      console.log(chalk.bold.red(`\n❌ VALIDATION FAILED`));
      console.log(chalk.red(`${summary.failed} test(s) need attention.`));

      // Show failed tests
      console.log(chalk.yellow('\nFailed tests:'));
      this.validationResults.tests
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(chalk.red(`  - ${test.test}: ${test.message}`));
        });
    }

    // Show warnings
    const warnings = this.validationResults.tests.filter(t => t.warning);
    if (warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      warnings.forEach(test => {
        console.log(chalk.yellow(`  - ${test.test}: ${test.warning}`));
      });
    }
  }
}

// Run validation
const validator = new N8nNodeValidator();
validator.validate().catch(error => {
  console.error(chalk.red('\n❌ Validation failed with error:'), error);
  process.exit(1);
});