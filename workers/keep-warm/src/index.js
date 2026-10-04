// Render's free tier sleeps the backend after ~15 minutes without traffic.
// GitHub's scheduled workflows fire hours apart in practice, so this Worker's
// cron trigger does the pinging instead: Cloudflare runs it on time.

export default {
  async scheduled(event, env, ctx) {
    const started = Date.now();
    const res = await fetch(env.HEALTH_URL, {
      headers: { 'User-Agent': 'prateeks16-keep-warm' },
    });
    console.log(`GET ${env.HEALTH_URL} -> ${res.status} in ${Date.now() - started}ms`);
    if (!res.ok) {
      throw new Error(`health check returned ${res.status}`);
    }
  },
};
