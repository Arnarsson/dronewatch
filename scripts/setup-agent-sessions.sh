#!/usr/bin/env bash
# Setup parallel git worktree sessions for DroneWatch agents
# Usage: ./scripts/setup-agent-sessions.sh

set -euo pipefail

# Configuration
REPO_ROOT="$(git rev-parse --show-toplevel)"
SESS_ROOT="$(dirname "$REPO_ROOT")/dronewatch-agents"
MAIN_BRANCH="main"

# Define agents and their ports
AGENTS=(
    "incident-validator:3001"
    "scraper-orchestrator:3002"
    "performance-monitor:3003"
    "realtime-coordinator:3004"
    "geo-intelligence:3005"
    "automation-reliability:3006"
    "parallel-orchestrator:3007"
)

echo "🚀 Setting up DroneWatch agent worktree sessions..."
echo "📁 Sessions will be created in: $SESS_ROOT"
echo ""

# Create parent directory
mkdir -p "$SESS_ROOT"

# Fetch latest
echo "📥 Fetching latest changes..."
git fetch --all --prune

# Create worktree for each agent
for agent_config in "${AGENTS[@]}"; do
    agent="${agent_config%%:*}"
    port="${agent_config##*:}"
    branch="agent/${agent}"
    path="${SESS_ROOT}/${agent}"

    echo "→ Creating worktree for ${agent} (port ${port})"

    # Remove if exists (cleanup)
    if [ -d "$path" ]; then
        echo "  ⚠️  Removing existing worktree at $path"
        git worktree remove --force "$path" 2>/dev/null || true
    fi

    # Create new worktree
    git worktree add -b "$branch" "$path" "origin/${MAIN_BRANCH}" 2>/dev/null || {
        # Branch might already exist, use it
        git worktree add "$path" "$branch" 2>/dev/null || {
            # Force checkout existing branch
            git branch -D "$branch" 2>/dev/null || true
            git worktree add -b "$branch" "$path" "origin/${MAIN_BRANCH}"
        }
    }

    # Create agent-specific config
    cat > "${path}/.agent-config" << EOF
# Agent Configuration
AGENT_NAME=${agent}
AGENT_PORT=${port}
WEBSOCKET_PORT=$((port + 100))
API_PORT=$((port + 200))
NODE_ENV=development

# Agent-specific settings
export PORT=${port}
export AGENT_ROLE=${agent}
export CACHE_DIR=.cache-${agent}
export LOG_FILE=logs/${agent}.log

# Enable agent in automation
export ENABLE_AGENT=true
export AGENT_CONFIG=.claude/agents/${agent}.md
EOF

    # Create agent startup script
    cat > "${path}/start-agent.sh" << 'SCRIPT'
#!/bin/bash
source .agent-config
echo "🤖 Starting $AGENT_NAME on port $PORT"

# Create necessary directories
mkdir -p logs .cache-${AGENT_NAME}

# Start the appropriate service based on agent
case $AGENT_NAME in
    "incident-validator")
        echo "📊 Starting incident validation service..."
        npm run dev
        ;;
    "scraper-orchestrator")
        echo "🕷️ Starting scraper orchestration..."
        npm run automation:continuous
        ;;
    "performance-monitor")
        echo "⚡ Starting performance monitoring..."
        npm run dev
        ;;
    "realtime-coordinator")
        echo "📡 Starting WebSocket coordinator..."
        npm run dev
        ;;
    "geo-intelligence")
        echo "🗺️ Starting geo-intelligence analysis..."
        npm run dev
        ;;
    "automation-reliability")
        echo "🛡️ Starting reliability monitoring..."
        npm run automation:start
        ;;
    "parallel-orchestrator")
        echo "🎯 Starting parallel orchestrator..."
        npm run dev
        ;;
    *)
        echo "Starting default service..."
        npm run dev
        ;;
esac
SCRIPT
    chmod +x "${path}/start-agent.sh"

    echo "  ✅ Created at: $path"
    echo "     Branch: $branch"
    echo "     Port: $port"
    echo ""
done

# Create master control script
cat > "${SESS_ROOT}/control-agents.sh" << 'CONTROL'
#!/bin/bash
# Master control script for all agents

COMMAND=${1:-status}

case $COMMAND in
    start-all)
        echo "🚀 Starting all agents..."
        for dir in */; do
            if [ -f "${dir}start-agent.sh" ]; then
                echo "Starting ${dir%/}..."
                (cd "$dir" && npm install --quiet && ./start-agent.sh &)
            fi
        done
        ;;

    stop-all)
        echo "🛑 Stopping all agents..."
        pkill -f "node.*dev"
        pkill -f "npm.*run"
        echo "All agents stopped"
        ;;

    status)
        echo "📊 Agent Status:"
        for dir in */; do
            if [ -f "${dir}.agent-config" ]; then
                agent="${dir%/}"
                port=$(grep "^AGENT_PORT=" "${dir}.agent-config" | cut -d= -f2)
                if lsof -i :"$port" &>/dev/null; then
                    echo "  ✅ ${agent}: Running on port ${port}"
                else
                    echo "  ❌ ${agent}: Not running (port ${port})"
                fi
            fi
        done
        ;;

    logs)
        echo "📜 Tailing all agent logs..."
        tail -f */logs/*.log
        ;;

    *)
        echo "Usage: $0 {start-all|stop-all|status|logs}"
        exit 1
        ;;
esac
CONTROL
chmod +x "${SESS_ROOT}/control-agents.sh"

# Create parallel execution script
cat > "${SESS_ROOT}/run-parallel-task.sh" << 'PARALLEL'
#!/bin/bash
# Run a task across all agents in parallel

TASK="${1:-status}"

echo "🔄 Running task '$TASK' across all agents in parallel..."

for dir in */; do
    if [ -d "$dir" ] && [ "$dir" != "scripts/" ]; then
        agent="${dir%/}"
        echo "→ ${agent}: Running $TASK"
        (cd "$dir" && eval "$TASK") &
    fi
done

wait
echo "✅ All parallel tasks completed"
PARALLEL
chmod +x "${SESS_ROOT}/run-parallel-task.sh"

# Create README for the sessions
cat > "${SESS_ROOT}/README.md" << 'README'
# DroneWatch Agent Sessions

This directory contains parallel git worktree sessions for each DroneWatch agent.

## Quick Start

### Start all agents:
```bash
./control-agents.sh start-all
```

### Check status:
```bash
./control-agents.sh status
```

### Stop all agents:
```bash
./control-agents.sh stop-all
```

### View logs:
```bash
./control-agents.sh logs
```

## Individual Agent Access

Each agent has its own directory with:
- `.agent-config`: Environment configuration
- `start-agent.sh`: Individual startup script
- Isolated git branch for development

## Ports Assignment

| Agent | Dev Port | WebSocket | API |
|-------|----------|-----------|-----|
| incident-validator | 3001 | 3101 | 3201 |
| scraper-orchestrator | 3002 | 3102 | 3202 |
| performance-monitor | 3003 | 3103 | 3203 |
| realtime-coordinator | 3004 | 3104 | 3204 |
| geo-intelligence | 3005 | 3105 | 3205 |
| automation-reliability | 3006 | 3106 | 3206 |
| parallel-orchestrator | 3007 | 3107 | 3207 |

## Running Tasks in Parallel

Execute any command across all agents:
```bash
./run-parallel-task.sh "npm test"
./run-parallel-task.sh "git pull"
```

## Cleanup

To remove all worktree sessions:
```bash
for dir in */; do
    git worktree remove "$dir"
done
```
README

echo ""
echo "✨ Setup complete!"
echo ""
echo "📊 Current worktrees:"
git worktree list
echo ""
echo "🎯 Next steps:"
echo "  1. cd ${SESS_ROOT}"
echo "  2. ./control-agents.sh start-all  # Start all agents"
echo "  3. ./control-agents.sh status     # Check status"
echo ""
echo "💡 Each agent session is in: ${SESS_ROOT}/<agent-name>"
echo "💡 You can open each in a separate terminal/editor"