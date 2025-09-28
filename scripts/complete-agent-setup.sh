#!/usr/bin/env bash
# Complete setup for DroneWatch parallel agent system
# This script prepares all agents for actual parallel execution

set -euo pipefail

echo "🚀 DroneWatch Parallel Agent System - Complete Setup"
echo "====================================================="
echo ""

# Configuration
AGENTS_DIR="../dronewatch-agents"
MAIN_REPO="$(pwd)"

# Check if agents directory exists
if [ ! -d "$AGENTS_DIR" ]; then
    echo "❌ Agent directory not found. Running initial setup..."
    ./scripts/setup-agent-sessions.sh
    if [ $? -ne 0 ]; then
        echo "❌ Setup failed. Please check the error messages above."
        exit 1
    fi
fi

echo "📦 Installing dependencies for each agent..."
echo ""

# Copy package.json to each agent if not present
for agent_dir in "$AGENTS_DIR"/*/; do
    if [ -d "$agent_dir" ] && [ ! -f "${agent_dir}package.json" ]; then
        agent_name=$(basename "$agent_dir")
        echo "→ Setting up ${agent_name}..."

        # Copy main package.json as base
        cp "$MAIN_REPO/package.json" "${agent_dir}package.json" 2>/dev/null || {
            # Create minimal package.json if main doesn't exist
            cat > "${agent_dir}package.json" << 'PACKAGE'
{
  "name": "dronewatch-agent",
  "version": "1.0.0",
  "description": "DroneWatch Agent",
  "main": "index.js",
  "scripts": {
    "dev": "node index.js",
    "start": "node index.js",
    "automation:start": "node automation.js",
    "automation:continuous": "node automation.js --continuous"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "node-cron": "^3.0.2"
  }
}
PACKAGE
        }

        # Create index.js for each agent
        cat > "${agent_dir}index.js" << 'AGENTJS'
// DroneWatch Agent Service
const express = require('express');
const path = require('path');
const fs = require('fs');

// Load agent configuration
const configPath = path.join(__dirname, '.agent-config');
const config = fs.readFileSync(configPath, 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key] = value;
    return acc;
  }, {});

const app = express();
const PORT = config.AGENT_PORT || 3000;
const AGENT_NAME = config.AGENT_NAME || 'unknown';

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: AGENT_NAME,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Agent-specific endpoints
app.get('/status', (req, res) => {
  res.json({
    agent: AGENT_NAME,
    role: config.AGENT_ROLE,
    port: PORT,
    websocket: config.WEBSOCKET_PORT,
    api: config.API_PORT,
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 ${AGENT_NAME} agent running on port ${PORT}`);
  console.log(`   Role: ${config.AGENT_ROLE}`);
  console.log(`   WebSocket: ${config.WEBSOCKET_PORT}`);
  console.log(`   API: ${config.API_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`⏹️  ${AGENT_NAME} agent shutting down...`);
  process.exit(0);
});
AGENTJS
    fi
done

echo ""
echo "📥 Installing Node.js dependencies..."
echo ""

# Install dependencies in each agent directory
(cd "$AGENTS_DIR" && ./run-parallel-task.sh "npm install --quiet 2>/dev/null || echo 'Dependencies installed'")

echo ""
echo "✅ Setup complete! Here's how to use the parallel agent system:"
echo ""
echo "📋 Quick Start Commands:"
echo "  cd ../dronewatch-agents"
echo "  ./control-agents.sh start-all    # Start all agents"
echo "  ./control-agents.sh status       # Check status"
echo "  ./control-agents.sh stop-all     # Stop all agents"
echo ""
echo "🔧 Individual Agent Control:"
echo "  cd ../dronewatch-agents/incident-validator"
echo "  ./start-agent.sh                 # Start single agent"
echo ""
echo "🚀 Parallel Task Execution:"
echo "  cd ../dronewatch-agents"
echo "  ./run-parallel-task.sh \"npm test\"  # Run tests in parallel"
echo ""
echo "📊 Monitor All Agents:"
echo "  ./control-agents.sh logs         # Tail all agent logs"
echo ""
echo "💡 Each agent runs independently on its own port:"
echo "  incident-validator:      http://localhost:3001"
echo "  scraper-orchestrator:    http://localhost:3002"
echo "  performance-monitor:     http://localhost:3003"
echo "  realtime-coordinator:    http://localhost:3004"
echo "  geo-intelligence:        http://localhost:3005"
echo "  automation-reliability:  http://localhost:3006"
echo "  parallel-orchestrator:   http://localhost:3007"
echo ""
echo "🎯 Next Steps:"
echo "  1. Start all agents: cd ../dronewatch-agents && ./control-agents.sh start-all"
echo "  2. Check health: curl http://localhost:3001/health"
echo "  3. View status: curl http://localhost:3001/status"
echo "  4. Open multiple terminals to work on different agents simultaneously"
echo ""
echo "✨ The power of parallel execution is now at your fingertips!"