const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const N8N_URL = process.env.N8N_URL || 'http://n8n:5678';
const WORKFLOWS_DIR = '/workflows';
const TEST_RESULTS_DIR = '/test-results';

// Ensure test results directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

class N8nTestRunner {
  constructor() {
    this.api = axios.create({
      baseURL: `${N8N_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.results = [];
  }

  async waitForN8n() {
    console.log(chalk.blue('⏳ Waiting for n8n to be ready...'));
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await axios.get(`${N8N_URL}/healthz`);
        if (response.status === 200) {
          console.log(chalk.green('✅ n8n is ready!'));
          return true;
        }
      } catch (error) {
        retries++;
        console.log(`Waiting for n8n... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('n8n failed to start within timeout');
  }

  async checkCustomNode() {
    console.log(chalk.blue('\n🔍 Checking custom node installation...'));

    try {
      const response = await this.api.get('/node-types');
      const nodeTypes = response.data.data || [];

      const customNode = nodeTypes.find(node =>
        node.name === 'n8n-nodes-notion-set-icon.notionSetIcon'
      );

      if (customNode) {
        console.log(chalk.green('✅ Custom Notion Set Icon node is installed'));
        console.log(chalk.gray(`   Version: ${customNode.version || 'unknown'}`));
        return true;
      } else {
        console.log(chalk.red('❌ Custom Notion Set Icon node not found'));
        console.log(chalk.yellow('Available nodes:'));
        nodeTypes.forEach(node => {
          if (node.name.includes('notion')) {
            console.log(chalk.gray(`   - ${node.name}`));
          }
        });
        return false;
      }
    } catch (error) {
      console.error(chalk.red('Error checking node types:'), error.message);
      return false;
    }
  }

  async importWorkflow(workflowPath) {
    const workflowName = path.basename(workflowPath, '.json');
    console.log(chalk.blue(`\n📥 Importing workflow: ${workflowName}`));

    try {
      const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

      // Add timestamp to workflow name to avoid conflicts
      workflowData.name = `${workflowData.name} - Test ${Date.now()}`;

      const response = await this.api.post('/workflows', workflowData);

      if (response.status === 200 || response.status === 201) {
        console.log(chalk.green(`✅ Workflow imported: ${workflowData.name}`));
        return response.data.data;
      } else {
        console.log(chalk.red(`❌ Failed to import workflow: ${response.status}`));
        return null;
      }
    } catch (error) {
      console.error(chalk.red(`Error importing workflow ${workflowName}:`), error.message);
      if (error.response?.data) {
        console.error(chalk.gray(JSON.stringify(error.response.data, null, 2)));
      }
      return null;
    }
  }

  async activateWorkflow(workflowId) {
    console.log(chalk.blue(`🔄 Activating workflow ${workflowId}...`));

    try {
      const response = await this.api.patch(`/workflows/${workflowId}`, {
        active: true
      });

      if (response.status === 200) {
        console.log(chalk.green('✅ Workflow activated'));
        return true;
      } else {
        console.log(chalk.red('❌ Failed to activate workflow'));
        return false;
      }
    } catch (error) {
      console.error(chalk.red('Error activating workflow:'), error.message);
      return false;
    }
  }

  async executeWorkflow(workflowId) {
    console.log(chalk.blue(`▶️  Executing workflow ${workflowId}...`));

    try {
      const response = await this.api.post(`/workflows/${workflowId}/run`, {
        data: {}
      });

      if (response.status === 200 || response.status === 201) {
        const execution = response.data.data;
        console.log(chalk.green(`✅ Workflow executed: ${execution.id}`));

        // Wait for execution to complete
        const executionResult = await this.waitForExecution(execution.id);
        return executionResult;
      } else {
        console.log(chalk.red('❌ Failed to execute workflow'));
        return null;
      }
    } catch (error) {
      console.error(chalk.red('Error executing workflow:'), error.message);
      if (error.response?.data) {
        console.error(chalk.gray(JSON.stringify(error.response.data, null, 2)));
      }
      return null;
    }
  }

  async waitForExecution(executionId) {
    console.log(chalk.blue(`⏳ Waiting for execution ${executionId}...`));
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await this.api.get(`/executions/${executionId}`);
        const execution = response.data.data;

        if (execution.finished || execution.status === 'success' || execution.status === 'error') {
          if (execution.status === 'success') {
            console.log(chalk.green('✅ Execution completed successfully'));
          } else {
            console.log(chalk.red(`❌ Execution failed: ${execution.status}`));
          }
          return execution;
        }
      } catch (error) {
        console.log(chalk.yellow(`Waiting for execution... (${retries}/${maxRetries})`));
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(chalk.red('❌ Execution timeout'));
    return null;
  }

  async runTests() {
    console.log(chalk.bold.cyan('\n🚀 Starting n8n Notion Set Icon Tests\n'));
    console.log(chalk.gray('================================\n'));

    try {
      // Wait for n8n to be ready
      await this.waitForN8n();

      // Check if custom node is installed
      const nodeInstalled = await this.checkCustomNode();
      this.results.push({
        test: 'Custom Node Installation',
        passed: nodeInstalled,
        message: nodeInstalled ? 'Node installed successfully' : 'Node not found'
      });

      if (!nodeInstalled) {
        console.log(chalk.red('\n⚠️  Cannot proceed without custom node installed'));
        this.saveResults();
        process.exit(1);
      }

      // Import and test workflows
      const workflowFiles = fs.readdirSync(WORKFLOWS_DIR)
        .filter(file => file.endsWith('.json'));

      console.log(chalk.blue(`\n📂 Found ${workflowFiles.length} workflow(s) to test`));

      for (const workflowFile of workflowFiles) {
        const workflowPath = path.join(WORKFLOWS_DIR, workflowFile);

        // Import workflow
        const workflow = await this.importWorkflow(workflowPath);

        if (workflow) {
          // Try to execute workflow
          const execution = await this.executeWorkflow(workflow.id);

          this.results.push({
            test: `Workflow: ${workflowFile}`,
            workflowId: workflow.id,
            passed: execution && execution.status === 'success',
            message: execution ? `Execution status: ${execution.status}` : 'Failed to execute',
            executionId: execution?.id
          });
        } else {
          this.results.push({
            test: `Workflow: ${workflowFile}`,
            passed: false,
            message: 'Failed to import workflow'
          });
        }
      }

      // Test API endpoints
      await this.testApiEndpoints();

      // Save and display results
      this.saveResults();
      this.displayResults();

    } catch (error) {
      console.error(chalk.red('\n❌ Test failed:'), error.message);
      process.exit(1);
    }
  }

  async testApiEndpoints() {
    console.log(chalk.blue('\n🔌 Testing API endpoints...'));

    const endpoints = [
      { name: 'Health Check', method: 'GET', path: '/healthz', baseUrl: N8N_URL },
      { name: 'Workflows List', method: 'GET', path: '/workflows' },
      { name: 'Node Types', method: 'GET', path: '/node-types' },
      { name: 'Credentials Types', method: 'GET', path: '/credential-types' }
    ];

    for (const endpoint of endpoints) {
      try {
        const url = endpoint.baseUrl ?
          `${endpoint.baseUrl}${endpoint.path}` :
          `${N8N_URL}/api/v1${endpoint.path}`;

        const response = await axios({
          method: endpoint.method,
          url: url
        });

        const passed = response.status === 200;
        this.results.push({
          test: `API: ${endpoint.name}`,
          passed,
          message: `Status: ${response.status}`,
          endpoint: endpoint.path
        });

        console.log(
          passed ?
            chalk.green(`✅ ${endpoint.name}: OK`) :
            chalk.red(`❌ ${endpoint.name}: Failed`)
        );
      } catch (error) {
        this.results.push({
          test: `API: ${endpoint.name}`,
          passed: false,
          message: error.message,
          endpoint: endpoint.path
        });
        console.log(chalk.red(`❌ ${endpoint.name}: ${error.message}`));
      }
    }
  }

  saveResults() {
    const timestamp = new Date().toISOString();
    const resultsFile = path.join(TEST_RESULTS_DIR, `test-results-${Date.now()}.json`);

    const report = {
      timestamp,
      n8nUrl: N8N_URL,
      totalTests: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      results: this.results
    };

    fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`\n📊 Results saved to: ${resultsFile}`));
  }

  displayResults() {
    console.log(chalk.bold.cyan('\n📊 Test Results Summary\n'));
    console.log(chalk.gray('================================\n'));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? chalk.green : chalk.red;
      console.log(color(`${icon} ${result.test}: ${result.message}`));
    });

    console.log(chalk.gray('\n================================'));
    console.log(chalk.bold(`\nTotal: ${this.results.length} tests`));
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));

    if (failed === 0) {
      console.log(chalk.bold.green('\n🎉 All tests passed!'));
      process.exit(0);
    } else {
      console.log(chalk.bold.red(`\n⚠️  ${failed} test(s) failed`));
      process.exit(1);
    }
  }
}

// Run tests
const runner = new N8nTestRunner();
runner.runTests().catch(error => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});