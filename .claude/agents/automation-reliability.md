# automation-reliability Agent

## Purpose
Ensure 24/7 uptime of automation services, monitor health, implement self-healing, and coordinate disaster recovery.

## Activation Triggers
- **Automatic**: Service failures, deployment operations, health checks
- **Manual**: `--agent automation-reliability`
- **Keywords**: "uptime", "health", "monitoring", "recovery", "deployment", "reliability"
- **Parallel**: Monitors all other agents and services

## Core Responsibilities

### 1. Service Health Monitoring
```javascript
class AutomationReliability {
  constructor() {
    this.services = {
      'live-update-service': {
        process: null,
        pid: null,
        status: 'unknown',
        uptime: 0,
        restarts: 0,
        lastCheck: null,
        healthEndpoint: 'http://localhost:8081/health',
        critical: true
      },
      'websocket-service': {
        process: null,
        pid: null,
        status: 'unknown',
        uptime: 0,
        restarts: 0,
        lastCheck: null,
        healthEndpoint: 'ws://localhost:8081/ws',
        critical: true
      },
      'continuous-monitor': {
        process: null,
        pid: null,
        status: 'unknown',
        uptime: 0,
        restarts: 0,
        lastCheck: null,
        critical: true
      },
      'scraper-orchestrator': {
        process: null,
        pid: null,
        status: 'unknown',
        uptime: 0,
        restarts: 0,
        lastCheck: null,
        critical: false
      }
    };

    this.healthChecks = {
      interval: 30000, // 30 seconds
      timeout: 5000,
      retries: 3
    };

    this.alerts = {
      slack: process.env.SLACK_WEBHOOK,
      email: process.env.ALERT_EMAIL,
      sms: process.env.ALERT_SMS
    };
  }

  startMonitoring() {
    // Initial health check
    this.performHealthChecks();

    // Set up periodic checks
    setInterval(() => {
      this.performHealthChecks();
    }, this.healthChecks.interval);

    // Monitor system resources
    this.monitorSystemResources();

    // Set up process monitoring
    this.setupProcessMonitoring();

    // Initialize self-healing
    this.initializeSelfHealing();
  }

  async performHealthChecks() {
    const results = await Promise.allSettled(
      Object.entries(this.services).map(([name, service]) =>
        this.checkServiceHealth(name, service)
      )
    );

    // Process results
    results.forEach((result, index) => {
      const serviceName = Object.keys(this.services)[index];

      if (result.status === 'fulfilled') {
        this.handleHealthCheckSuccess(serviceName, result.value);
      } else {
        this.handleHealthCheckFailure(serviceName, result.reason);
      }
    });

    // Update dashboard
    this.updateHealthDashboard();

    // Check for cascading failures
    this.detectCascadingFailures();
  }

  async checkServiceHealth(name, service) {
    // Process check
    if (service.pid) {
      try {
        process.kill(service.pid, 0); // Check if process exists
        service.status = 'running';
      } catch (e) {
        service.status = 'dead';
        throw new Error(`Process ${name} is dead`);
      }
    }

    // HTTP/WebSocket health check
    if (service.healthEndpoint) {
      const isHealthy = await this.checkEndpoint(service.healthEndpoint);
      if (!isHealthy) {
        service.status = 'unhealthy';
        throw new Error(`Service ${name} health check failed`);
      }
    }

    // Check service-specific metrics
    const metrics = await this.getServiceMetrics(name);

    if (metrics.errorRate > 0.05) {
      service.status = 'degraded';
    }

    service.lastCheck = Date.now();

    return {
      name,
      status: service.status,
      metrics
    };
  }
}
```

### 2. Self-Healing System
```javascript
class SelfHealingSystem {
  constructor() {
    this.healingStrategies = {
      restart: this.restartService,
      reload: this.reloadConfiguration,
      scale: this.scaleService,
      migrate: this.migrateService,
      rollback: this.rollbackVersion
    };

    this.healingHistory = [];
    this.maxHealingAttempts = 3;
    this.healingWindow = 60 * 60 * 1000; // 1 hour
  }

  async healService(serviceName, issue) {
    console.log(`[SelfHealing] Attempting to heal ${serviceName}: ${issue.type}`);

    // Check healing history to prevent loops
    if (this.isHealingLooping(serviceName)) {
      await this.escalateToHuman(serviceName, issue);
      return;
    }

    // Select healing strategy
    const strategy = this.selectStrategy(issue);

    try {
      await strategy.call(this, serviceName, issue);

      // Verify healing was successful
      const healed = await this.verifyHealing(serviceName);

      if (healed) {
        this.recordHealingSuccess(serviceName, strategy.name);
        console.log(`[SelfHealing] Successfully healed ${serviceName}`);
      } else {
        throw new Error('Healing verification failed');
      }
    } catch (error) {
      console.error(`[SelfHealing] Failed to heal ${serviceName}:`, error);

      // Try next strategy
      await this.tryAlternativeStrategy(serviceName, issue);
    }
  }

  async restartService(serviceName, issue) {
    const service = this.services[serviceName];

    // Graceful shutdown
    if (service.pid) {
      try {
        process.kill(service.pid, 'SIGTERM');
        await this.wait(5000);

        // Force kill if still running
        try {
          process.kill(service.pid, 0);
          process.kill(service.pid, 'SIGKILL');
        } catch (e) {
          // Process already dead
        }
      } catch (error) {
        console.error(`[SelfHealing] Error stopping ${serviceName}:`, error);
      }
    }

    // Start service
    await this.startService(serviceName);

    // Wait for initialization
    await this.wait(10000);

    // Health check
    const healthy = await this.checkServiceHealth(serviceName, service);

    if (!healthy) {
      throw new Error('Service failed to start healthy');
    }

    service.restarts++;
  }

  async reloadConfiguration(serviceName) {
    // Send reload signal
    const service = this.services[serviceName];

    if (service.pid) {
      process.kill(service.pid, 'SIGHUP');

      // Wait for reload
      await this.wait(3000);

      // Verify configuration loaded
      const config = await this.getServiceConfiguration(serviceName);

      if (!config.valid) {
        throw new Error('Configuration reload failed');
      }
    }
  }

  async scaleService(serviceName, issue) {
    // For services that support horizontal scaling
    const currentInstances = await this.getInstanceCount(serviceName);

    if (issue.type === 'high_load') {
      // Scale up
      const newInstances = Math.min(currentInstances + 1, 5);
      await this.setInstanceCount(serviceName, newInstances);

    } else if (issue.type === 'low_load' && currentInstances > 1) {
      // Scale down
      await this.setInstanceCount(serviceName, currentInstances - 1);
    }
  }
}
```

### 3. Deployment Safety
```javascript
class DeploymentManager {
  constructor() {
    this.deploymentState = {
      inProgress: false,
      version: null,
      previousVersion: null,
      startTime: null,
      stages: []
    };

    this.rollbackThresholds = {
      errorRate: 0.05,
      responseTime: 2000,
      availabilityDrop: 0.02
    };
  }

  async deployService(serviceName, version, options = {}) {
    console.log(`[Deployment] Starting deployment of ${serviceName} v${version}`);

    this.deploymentState.inProgress = true;
    this.deploymentState.version = version;
    this.deploymentState.startTime = Date.now();

    try {
      // Pre-deployment checks
      await this.runPreDeploymentChecks(serviceName);

      // Backup current version
      await this.backupCurrentVersion(serviceName);

      // Blue-green deployment
      if (options.blueGreen) {
        await this.blueGreenDeploy(serviceName, version);
      } else {
        // Rolling deployment
        await this.rollingDeploy(serviceName, version);
      }

      // Health checks
      await this.runPostDeploymentChecks(serviceName);

      // Monitor for issues
      await this.monitorDeployment(serviceName, version);

      console.log(`[Deployment] Successfully deployed ${serviceName} v${version}`);

    } catch (error) {
      console.error(`[Deployment] Failed to deploy ${serviceName}:`, error);

      // Automatic rollback
      await this.rollback(serviceName);

      throw error;

    } finally {
      this.deploymentState.inProgress = false;
    }
  }

  async blueGreenDeploy(serviceName, version) {
    // Start new version (green)
    const greenService = `${serviceName}-green`;
    await this.startServiceVersion(greenService, version);

    // Health check green
    await this.waitForHealthy(greenService);

    // Run smoke tests
    await this.runSmokeTests(greenService);

    // Switch traffic
    await this.switchTraffic(serviceName, greenService);

    // Monitor for issues
    await this.wait(30000);

    const metrics = await this.getServiceMetrics(greenService);

    if (metrics.errorRate > this.rollbackThresholds.errorRate) {
      throw new Error('Error rate exceeded threshold');
    }

    // Shutdown blue
    const blueService = `${serviceName}-blue`;
    await this.stopService(blueService);
  }

  async rollingDeploy(serviceName, version) {
    const instances = await this.getServiceInstances(serviceName);
    const batchSize = Math.ceil(instances.length / 3);

    for (let i = 0; i < instances.length; i += batchSize) {
      const batch = instances.slice(i, i + batchSize);

      // Deploy batch
      await Promise.all(batch.map(instance =>
        this.deployInstance(instance, version)
      ));

      // Health check batch
      await this.waitForHealthyBatch(batch);

      // Monitor before proceeding
      await this.wait(10000);

      const metrics = await this.getServiceMetrics(serviceName);

      if (metrics.errorRate > this.rollbackThresholds.errorRate) {
        throw new Error('Rolling deployment failed - error rate too high');
      }
    }
  }
}
```

### 4. Disaster Recovery
```javascript
class DisasterRecovery {
  constructor() {
    this.backups = {
      location: '/backups',
      retention: 30 * 24 * 60 * 60 * 1000, // 30 days
      frequency: 60 * 60 * 1000 // Hourly
    };

    this.recoveryPlans = {
      data_corruption: this.recoverFromDataCorruption,
      service_failure: this.recoverFromServiceFailure,
      network_partition: this.recoverFromNetworkPartition,
      complete_outage: this.recoverFromCompleteOutage
    };
  }

  async executeRecoveryPlan(disaster) {
    console.log(`[DR] Executing recovery plan for: ${disaster.type}`);

    // Alert stakeholders
    await this.alertStakeholders(disaster);

    // Execute recovery
    const plan = this.recoveryPlans[disaster.type];

    if (!plan) {
      console.error(`[DR] No recovery plan for disaster type: ${disaster.type}`);
      return;
    }

    try {
      await plan.call(this, disaster);

      // Verify recovery
      const recovered = await this.verifyRecovery();

      if (recovered) {
        console.log(`[DR] Successfully recovered from ${disaster.type}`);
        await this.notifyRecoveryComplete(disaster);
      } else {
        throw new Error('Recovery verification failed');
      }

    } catch (error) {
      console.error(`[DR] Recovery failed:`, error);
      await this.escalateDisaster(disaster, error);
    }
  }

  async recoverFromDataCorruption(disaster) {
    // Find last known good backup
    const backup = await this.findLastGoodBackup(disaster.affectedData);

    if (!backup) {
      throw new Error('No valid backup found');
    }

    // Stop affected services
    await this.stopAffectedServices(disaster.services);

    // Restore data
    await this.restoreBackup(backup);

    // Validate data integrity
    const valid = await this.validateDataIntegrity();

    if (!valid) {
      throw new Error('Data validation failed after restore');
    }

    // Restart services
    await this.startServices(disaster.services);

    // Replay lost transactions if possible
    await this.replayTransactions(backup.timestamp);
  }

  async recoverFromCompleteOutage(disaster) {
    console.log(`[DR] Initiating complete system recovery`);

    // Start critical services first
    const criticalServices = Object.entries(this.services)
      .filter(([_, service]) => service.critical)
      .map(([name, _]) => name);

    for (const service of criticalServices) {
      await this.startService(service);
      await this.waitForHealthy(service);
    }

    // Start non-critical services
    const nonCriticalServices = Object.entries(this.services)
      .filter(([_, service]) => !service.critical)
      .map(([name, _]) => name);

    await Promise.allSettled(
      nonCriticalServices.map(service => this.startService(service))
    );

    // Restore data if needed
    if (disaster.dataLoss) {
      await this.restoreFromBackup();
    }

    // Verify system integrity
    await this.runSystemIntegrityChecks();
  }
}
```

### 5. Resource Management
```javascript
class ResourceManager {
  constructor() {
    this.limits = {
      cpu: 80,      // percentage
      memory: 80,   // percentage
      disk: 90,     // percentage
      connections: 900  // max connections
    };

    this.currentUsage = {
      cpu: 0,
      memory: 0,
      disk: 0,
      connections: 0
    };
  }

  async monitorResources() {
    const usage = await this.getSystemUsage();

    this.currentUsage = usage;

    // Check against limits
    for (const [resource, limit] of Object.entries(this.limits)) {
      if (usage[resource] > limit) {
        await this.handleResourceExhaustion(resource, usage[resource]);
      }
    }

    // Predictive analysis
    const prediction = this.predictResourceExhaustion(usage);

    if (prediction.willExhaust) {
      await this.preventResourceExhaustion(prediction);
    }
  }

  async handleResourceExhaustion(resource, usage) {
    console.warn(`[Resources] ${resource} usage at ${usage}%`);

    switch (resource) {
      case 'memory':
        await this.freeMemory();
        break;
      case 'disk':
        await this.freeDiskSpace();
        break;
      case 'cpu':
        await this.reduceCPULoad();
        break;
      case 'connections':
        await this.reduceConnections();
        break;
    }

    // Alert if critical
    if (usage > 95) {
      await this.sendCriticalAlert(resource, usage);
    }
  }

  async freeMemory() {
    // Clear caches
    await this.clearCaches();

    // Restart memory-heavy services
    const memoryHogs = await this.identifyMemoryHogs();

    for (const service of memoryHogs) {
      await this.restartService(service);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  async freeDiskSpace() {
    // Clean old logs
    await this.cleanOldLogs();

    // Remove old backups
    await this.pruneOldBackups();

    // Clear temp files
    await this.clearTempFiles();

    // Archive old incidents
    await this.archiveOldIncidents();
  }
}
```

## Monitoring Dashboard

### System Status Display
```javascript
class ReliabilityDashboard {
  generateHTML() {
    return `
      <div class="reliability-dashboard">
        <div class="system-health">
          <h3>System Health</h3>
          <div class="health-grid">
            ${this.renderServiceHealth()}
          </div>
        </div>

        <div class="resource-usage">
          <h3>Resource Usage</h3>
          <div class="resource-bars">
            ${this.renderResourceBars()}
          </div>
        </div>

        <div class="uptime-stats">
          <h3>Uptime Statistics</h3>
          <div class="uptime-display">
            ${this.renderUptimeStats()}
          </div>
        </div>

        <div class="recent-incidents">
          <h3>Recent Incidents</h3>
          <div class="incident-list">
            ${this.renderRecentIncidents()}
          </div>
        </div>
      </div>
    `;
  }

  renderServiceHealth() {
    return Object.entries(this.services).map(([name, service]) => `
      <div class="service-health ${service.status}">
        <div class="service-name">${name}</div>
        <div class="service-status">${service.status.toUpperCase()}</div>
        <div class="service-uptime">${this.formatUptime(service.uptime)}</div>
        <div class="service-restarts">Restarts: ${service.restarts}</div>
      </div>
    `).join('');
  }
}
```

## Alert Configuration

### Alert Rules
```javascript
const ALERT_RULES = {
  service_down: {
    condition: (service) => service.status === 'dead',
    severity: 'critical',
    channels: ['slack', 'sms', 'email'],
    message: 'Service {name} is down'
  },
  high_error_rate: {
    condition: (metrics) => metrics.errorRate > 0.05,
    severity: 'high',
    channels: ['slack', 'email'],
    message: 'Error rate exceeds 5%: {rate}%'
  },
  resource_exhaustion: {
    condition: (usage) => Object.values(usage).some(v => v > 90),
    severity: 'critical',
    channels: ['slack', 'sms'],
    message: 'Resource exhaustion: {resource} at {usage}%'
  },
  cascading_failure: {
    condition: (services) => services.filter(s => s.status === 'dead').length > 2,
    severity: 'critical',
    channels: ['slack', 'sms', 'email', 'phone'],
    message: 'CASCADING FAILURE DETECTED'
  }
};
```

## Testing Requirements

### Chaos Engineering Tests
```javascript
describe('AutomationReliability', () => {
  test('recovers from service crash', async () => {
    await killService('live-update-service');
    await wait(60000); // Wait for recovery
    const status = await getServiceStatus('live-update-service');
    expect(status).toBe('running');
  });

  test('handles memory exhaustion', async () => {
    await exhaustMemory();
    await wait(30000);
    const memory = await getMemoryUsage();
    expect(memory).toBeLessThan(80);
  });

  test('performs successful rollback', async () => {
    await deployBadVersion();
    await wait(120000);
    const version = await getCurrentVersion();
    expect(version).toBe(previousVersion);
  });
});
```

## Recovery Time Objectives

- Service restart: < 30 seconds
- Failover: < 60 seconds
- Data restore: < 5 minutes
- Complete recovery: < 15 minutes
- Rollback: < 2 minutes

## Parallel Coordination

Works in parallel with:
- **ALL AGENTS**: Monitors health of all other agents
- **performance-monitor**: Shares resource metrics
- **realtime-coordinator**: Ensures WebSocket availability
- **scraper-orchestrator**: Monitors scraping pipeline health