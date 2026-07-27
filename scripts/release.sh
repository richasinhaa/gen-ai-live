#!/bin/sh
# Deploy entrypoint. Everything the app needs to come up healthy happens here,
# so a deploy is the only step — nothing is ever run by hand against production.
#
#   1. Apply pending migrations.  Blocking: a schema mismatch means every page
#      500s, so it is better to fail the deploy and keep the previous release
#      serving than to start against the wrong schema.
#   2. Seed the catalogue.  Non-blocking: it is idempotent and mostly a no-op
#      after the first run, so a failure here should not take down a site that
#      was working. It shouts in the logs instead.
#   3. Start the server, exec'd so it becomes PID 1 and receives SIGTERM
#      directly — otherwise the platform's graceful shutdown is swallowed by
#      this shell and deploys end in a hard kill.

set -e

echo "--> Applying database migrations"
npx prisma migrate deploy

echo "--> Seeding catalogue"
if npm run --silent db:seed; then
  echo "--> Seed complete"
else
  echo "!!! Seed failed (exit $?). Starting anyway — the site may show an empty"
  echo "!!! catalogue until this is fixed. Check the error above."
fi

echo "--> Starting server"
exec npm run --silent start
