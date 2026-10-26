const assert = require('node:assert/strict')
const test = require('node:test')

test('worker startup recovers from an outage, backs off, starts once and stops retries', async () => {
  const { createWorkerStartup } = require('../server/dist/services/workerStartupState.js')
  let ready = false
  let starts = 0
  const timers = []
  const worker = createWorkerStartup({
    inspect: async () => ready,
    start: () => {
      starts += 1
    },
    schedule: (work, delay) => {
      const timer = { work, delay }
      timers.push(timer)
      return timer
    },
    cancel: (timer) => {
      timer.cancelled = true
    },
  })
  assert.equal(await worker.ensureStarted(), false)
  assert.equal(worker.status(), 'waiting')
  assert.equal(timers[0].delay, 1000)
  await timers.shift().work()
  assert.equal(timers[0].delay, 2000)
  ready = true
  await timers.shift().work()
  assert.equal(worker.status(), 'running')
  await Promise.all([worker.ensureStarted(), worker.ensureStarted()])
  assert.equal(starts, 1)
  worker.stop()
  assert.equal(worker.status(), 'stopped')
  assert.equal(await worker.ensureStarted(), false)

  const failing = createWorkerStartup({
    inspect: async () => {
      throw new Error('offline')
    },
    start: () => {
      starts += 1
    },
    schedule: (work, delay) => {
      const timer = { work, delay }
      timers.push(timer)
      return timer
    },
    cancel: (timer) => {
      timer.cancelled = true
    },
  })
  await failing.ensureStarted()
  for (let i = 0; i < 9; i++) await timers.shift().work()
  assert.equal(timers[0].delay, 60000)
  failing.stop()
  assert.equal(timers[0].cancelled, true)
})

test('partial scheduler startup is cleaned up before retrying all workers', () => {
  require('./helpers/test-env.cjs').configureTestEnvironment()
  const imported = require('../server/node_modules/node-cron')
  const cron = imported.default ?? imported
  const scheduler = require('../server/dist/services/pollingScheduler.js')
  const original = cron.schedule
  const jobs = []
  let calls = 0,
    fail = true
  cron.schedule = () => {
    calls++
    if (fail && calls === 3) throw new Error('Scheduler unavailable')
    const job = {
      stop() {
        this.stopped = true
      },
    }
    jobs.push(job)
    return job
  }
  try {
    assert.throws(() => scheduler.startPollingScheduler(), /Scheduler unavailable/)
    assert.ok(jobs.every((job) => job.stopped))
    fail = false
    calls = 0
    scheduler.startPollingScheduler()
    scheduler.startPollingScheduler()
    assert.equal(calls, 7)
  } finally {
    scheduler.stopPollingScheduler()
    cron.schedule = original
  }
})
