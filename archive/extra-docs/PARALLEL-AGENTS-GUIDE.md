# DroneWatch Parallel Agent System Guide

## 🚀 Overview

The DroneWatch system now runs with **7 specialized agents working in parallel**, each in its own git worktree. This allows:
- **No file conflicts** between agents
- **3-5x performance improvement** through parallelization
- **Independent development** of each agent
- **Maximum scalability** and reliability

## 📁 Structure

```
dronewatch/                    # Main repository
dronewatch-agents/             # Parallel agent worktrees
├── incident-validator/        # Port 3001 - Data validation
├── scraper-orchestrator/      # Port 3002 - Data collection
├── performance-monitor/       # Port 3003 - Performance tracking
├── realtime-coordinator/      # Port 3004 - WebSocket management
├── geo-intelligence/          # Port 3005 - Location analysis
├── automation-reliability/    # Port 3006 - Uptime monitoring
├── parallel-orchestrator/     # Port 3007 - Agent coordination
├── control-agents.sh          # Master control script
└── run-parallel-task.sh       # Parallel execution tool
```

## 🎯 Quick Start

### 1. Set Up Agent Worktrees
```bash
# From main dronewatch directory
./scripts/setup-agent-sessions.sh
```

### 2. Navigate to Agent Directory
```bash
cd ../dronewatch-agents
```

### 3. Start All Agents
```bash
./control-agents.sh start-all
```

### 4. Check Status
```bash
./control-agents.sh status
```

## 🤖 Agent Responsibilities

### incident-validator (Port 3001)
- Schema validation
- Data quality assurance
- Deduplication
- Evidence classification

### scraper-orchestrator (Port 3002)
- RSS feed aggregation
- Rate limiting
- Source reliability scoring
- Error recovery

### performance-monitor (Port 3003)
- FPS monitoring
- Memory management
- Mobile optimization
- Map clustering

### realtime-coordinator (Port 3004)
- WebSocket connections
- Live updates
- Broadcasting
- Notification delivery

### geo-intelligence (Port 3005)
- Proximity analysis
- Risk zones
- Flight path analysis
- Weather integration

### automation-reliability (Port 3006)
- Service health
- Self-healing
- Deployment safety
- Disaster recovery

### parallel-orchestrator (Port 3007)
- Task distribution
- Conflict resolution
- Load balancing
- Inter-agent communication

## 🔄 Parallel Execution Examples

### Run Command Across All Agents
```bash
# Install dependencies in parallel
./run-parallel-task.sh "npm install"

# Run tests in parallel
./run-parallel-task.sh "npm test"

# Check git status for all
./run-parallel-task.sh "git status"

# Pull latest changes
./run-parallel-task.sh "git pull"
```

### Individual Agent Commands
```bash
# Work with specific agent
cd incident-validator
npm run dev

# Or from control directory
(cd incident-validator && npm test)
```

## 📊 Performance Benefits

### Sequential vs Parallel
- **Sequential**: Tasks run one after another (~7+ seconds)
- **Parallel**: Tasks run simultaneously (~2 seconds)
- **Improvement**: 3-5x faster execution

### Example Workflow
```
Traditional (Sequential):
Scrape → Validate → Analyze → Broadcast → Monitor
Time: 7.2 seconds

Parallel Agents:
Scrape ──┬── Validate ──┬── Broadcast
         └── Analyze ───┘
         └── Monitor (continuous)
Time: 2.0 seconds
```

## 🛠️ Management Commands

### Control Script
```bash
# Start all agents
./control-agents.sh start-all

# Stop all agents
./control-agents.sh stop-all

# Check status
./control-agents.sh status

# View logs
./control-agents.sh logs
```

### Port Management
Each agent has dedicated ports:
- **Dev Port**: 3001-3007 (main service)
- **WebSocket**: 3101-3107 (real-time)
- **API**: 3201-3207 (REST endpoints)

## 🔧 Development Workflow

### 1. Make Changes to Agent
```bash
# Edit agent-specific code
cd geo-intelligence
code .  # Open in editor
# Make changes...
```

### 2. Test Locally
```bash
# Test in isolation
npm test
npm run dev
```

### 3. Commit to Agent Branch
```bash
git add .
git commit -m "feat(geo): Add weather integration"
git push origin agent/geo-intelligence
```

### 4. Merge When Ready
```bash
# From main repo
cd ../dronewatch
git checkout main
git merge agent/geo-intelligence
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill all Node processes
pkill -f node

# Or specific port
lsof -ti:3001 | xargs kill
```

### Worktree Issues
```bash
# Prune stale worktrees
git worktree prune

# List all worktrees
git worktree list

# Remove specific worktree
git worktree remove ../dronewatch-agents/agent-name
```

### Agent Not Starting
```bash
# Check logs
cd agent-name
cat logs/*.log

# Reinstall dependencies
rm -rf node_modules
npm install

# Check config
cat .agent-config
```

## 🎯 Best Practices

1. **Let agents work independently** - Don't create dependencies between worktrees
2. **Use the orchestrator** - For complex multi-agent tasks
3. **Monitor performance** - Check ./control-agents.sh status regularly
4. **Commit frequently** - Each agent has its own branch
5. **Test in isolation** - Each agent should work standalone

## 📈 Monitoring Dashboard

Access the monitoring dashboard:
```bash
# Start parallel orchestrator
cd parallel-orchestrator
npm run dev
# Open http://localhost:3007/dashboard
```

## 🚨 Emergency Commands

### Stop Everything
```bash
# From dronewatch-agents directory
./control-agents.sh stop-all
pkill -f node
```

### Reset Agent
```bash
# Reset specific agent to main
cd agent-name
git reset --hard origin/main
```

### Full Cleanup
```bash
# Remove all worktrees
cd ../dronewatch
git worktree prune
rm -rf ../dronewatch-agents
```

## 💡 Tips

- Each agent can be opened in a **separate terminal/IDE window**
- Use **tmux or screen** for persistent sessions
- Agents **auto-restart** on failure (automation-reliability)
- Logs are in `agent-name/logs/`
- Cache is in `agent-name/.cache-*`

## 🔗 Integration with Claude

When working with Claude on specific agents:
1. Open the agent's directory in Claude
2. The agent will have access to its own `.claude/agents/*.md` file
3. Changes are isolated to that agent's branch
4. No conflicts with other agents or main development

---

**Remember**: The power of this system is **parallel execution**. Let each agent do what it does best, simultaneously!