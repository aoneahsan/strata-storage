# Support

## How to Get Help

Thanks for using Strata Storage! Here's how to get help when you need it:

## 📖 Documentation

Start with our comprehensive documentation:

- **[Getting Started Guide](./docs/getting-started/quick-start.md)** - Basic setup and usage
- **[API Reference](./docs/api/README.md)** - Complete API documentation
- **[Examples](./docs/examples/README.md)** - Code examples for common use cases
- **[Platform Guides](./docs/guides/platforms/)** - Platform-specific information

## 🔍 Search First

Before opening an issue, please search:

1. **[Documentation](./docs/)** - The answer might already be documented
2. **[GitHub Issues](https://github.com/aoneahsan/strata-storage/issues)** - Someone might have asked already
3. **[Closed Issues](https://github.com/aoneahsan/strata-storage/issues?q=is%3Aissue+is%3Aclosed)** - Check resolved problems
4. **[Pull Requests](https://github.com/aoneahsan/strata-storage/pulls)** - See ongoing work

## ❓ Questions

### For Questions About:

#### Usage and Implementation
- Check the [documentation](./docs/) first
- Look at [examples](./examples/)
- Search [existing issues](https://github.com/aoneahsan/strata-storage/issues)
- Open a [new discussion](https://github.com/aoneahsan/strata-storage/discussions/new?category=q-a)

#### Best Practices
- Review our [guides](./docs/guides/)
- Check [pattern documentation](./docs/guides/patterns/)
- Ask in [discussions](https://github.com/aoneahsan/strata-storage/discussions)

#### Integration Help
- See [framework examples](./docs/examples/frameworks/)
- Check [platform guides](./docs/guides/platforms/)
- Look at the [example app](./examples/react-capacitor-app/)

## 🐛 Bug Reports

Found a bug? Please [create an issue](https://github.com/aoneahsan/strata-storage/issues/new) with:

1. **Clear title** describing the problem
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Environment details**:
   ```
   - Strata Storage version: 
   - Platform: (Web/iOS/Android)
   - Framework: (React/Vue/Angular/None)
   - Browser/OS version:
   - Node version:
   ```
5. **Code sample** that reproduces the issue
6. **Error messages** or logs

## 💡 Feature Requests

Have an idea? We'd love to hear it!

1. **Check existing requests** in [issues](https://github.com/aoneahsan/strata-storage/issues?q=is%3Aissue+label%3Aenhancement)
2. **Open a discussion** for initial feedback
3. **Create an issue** with:
   - Use case description
   - Proposed API/solution
   - Alternative solutions considered

## 🚨 Security Issues

**DO NOT** open public issues for security vulnerabilities!

See [SECURITY.md](./SECURITY.md) for reporting security issues privately.

## 💬 Community

### GitHub Discussions

For general questions, ideas, and community interaction:
[GitHub Discussions](https://github.com/aoneahsan/strata-storage/discussions)

Categories:
- **Q&A** - Ask questions
- **Ideas** - Share feature ideas
- **Show and Tell** - Share your projects
- **General** - Everything else

### Stack Overflow

Tag your questions with `strata-storage`:
[Stack Overflow](https://stackoverflow.com/questions/tagged/strata-storage)

## 🏃 Quick Answers

### Common Issues

#### Storage not persisting on iOS/Android
```typescript
// Make sure you're using the right storage type
await storage.set('key', value, {
  storage: 'preferences' // Use native storage
});
```

#### Encryption not working
```typescript
// Ensure you provide a password
await storage.set('key', value, {
  encrypt: true,
  encryptionPassword: 'your-password'
});
```

#### Cross-tab sync not working
```typescript
// Enable sync in configuration
const storage = new Strata({
  sync: {
    enabled: true,
    broadcastChannel: 'my-app-sync'
  }
});
```

### Debugging Tips

1. **Enable verbose logging**:
```typescript
const storage = new Strata({
  debug: true
});
```

2. **Check storage availability**:
```typescript
const available = await storage.isAvailable('indexedDB');
console.log('IndexedDB available:', available);
```

3. **Verify storage size**:
```typescript
const size = await storage.size();
console.log('Storage size:', size);
```

## 🤝 Contributing

Want to help? See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Ways to contribute:
- Report bugs
- Suggest features
- Improve documentation
- Submit pull requests
- Help others in discussions
- Share your projects

## 📮 Contact

- **GitHub**: [@aoneahsan](https://github.com/aoneahsan)
- **NPM**: [@aoneahsan](https://www.npmjs.com/~aoneahsan)
- **Email**: Via GitHub profile

## 🎯 Response Times

We aim to respond within:
- **Critical bugs**: 24-48 hours
- **Security issues**: 24 hours
- **General issues**: 3-5 business days
- **Feature requests**: 1 week
- **Pull requests**: 3-5 business days

Note: This is a community project. Response times are best-effort.

## 📚 Additional Resources

- [Changelog](./CHANGELOG.md) - Version history
- [Roadmap](https://github.com/aoneahsan/strata-storage/projects) - Future plans
- [License](./LICENSE.md) - License information
- [Security](./SECURITY.md) - Security policy

---

**Still need help?** Open an issue and we'll do our best to assist you!