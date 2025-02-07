# Development Guide

## Project Setup

1. **Prerequisites**

   - Node.js 20+
   - pnpm 8+
   - ClickHouse (local or cloud)

2. **Installation**

   ```bash
   git clone https://github.com/ijgfield/web-analytics.git
   cd web-analytics
   pnpm install
   ```

3. **Environment Setup**

   ```bash
   # In packages/server
   cp .env.example .env
   # Update with your ClickHouse credentials
   ```

4. **Database Setup**
   ```bash
   cd packages/server
   pnpm migrate
   ```

## Development Workflow

### 1. Running Locally

```bash
# Start server
cd packages/server
pnpm dev

# In another terminal, run example app
cd apps/example-store
pnpm dev
```

### 2. Making Changes

#### Client Package

1. Make changes in `packages/client/src`
2. Run `pnpm build` to compile
3. Test in example app

#### Server Package

1. Make changes in `packages/server/src`
2. Server will auto-reload

### 3. Version Control

We use conventional commits for automated versioning:

- `feat: ...` - New features (minor version)
- `fix: ...` - Bug fixes (patch version)
- `feat!: ...` or `fix!: ...` - Breaking changes (major version)

Examples:

```bash
git commit -m "feat: add user tracking options"
git commit -m "fix: resolve memory leak in event batching"
git commit -m "feat!: change event payload structure"
```

### 4. Testing Changes

```bash
# Run type checking
pnpm build

# Run tests (when implemented)
pnpm test
```

## Release Process

1. **Automated Releases**

   - Push to main with conventional commits
   - Release Please creates a PR
   - Merge PR to trigger release

2. **Manual Release**
   ```bash
   # If needed
   cd packages/client
   pnpm publish
   ```

## Project Structure

```
├── packages/
│   ├── client/               # Analytics client
│   │   ├── src/
│   │   │   ├── analytics.ts  # Main class
│   │   │   ├── types/       # Type definitions
│   │   │   └── utils/       # Utilities
│   │   └── package.json
│   └── server/              # Analytics server
│       ├── src/
│       │   ├── index.ts     # Server entry
│       │   ├── db/          # Database
│       │   └── config.ts    # Configuration
│       └── package.json
├── apps/
│   └── example-store/       # Example Next.js app
└── docs/                    # Documentation
```

## Common Tasks

### Adding Features

1. Determine if change is client or server-side
2. Update relevant documentation
3. Follow conventional commits
4. Create PR with changes

### Database Changes

1. Create new migration in `packages/server/src/db`
2. Update schema documentation
3. Test migration locally
4. Update relevant types

### Debugging

1. **Client Issues**

   - Enable debug mode in config
   - Check browser console
   - Verify network requests

2. **Server Issues**
   - Check server logs
   - Verify ClickHouse connection
   - Check event processing

## Best Practices

1. **Code Style**

   - Use TypeScript strict mode
   - Document public APIs
   - Add type definitions

2. **Performance**

   - Batch network requests
   - Use materialized views
   - Monitor memory usage

3. **Security**
   - Validate all inputs
   - Use environment variables
   - Follow GDPR guidelines
