# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-17

### Added
- Initial release of n8n Notion Set Icon node
- Support for setting custom icons on Notion pages
- Two icon source options: URL and file upload
- Comprehensive credential management for Notion API
- Local development and testing environment
- Support for multiple page ID formats (UUID, URL, raw hex)

### Features
- **Set Icon from URL**: Directly set page icons using external image URLs
- **Upload and Set Icon**: Upload local image files and set them as page icons
- **Flexible Page ID Support**: Accept various page ID formats for convenience
- **Secure Credential Management**: Proper handling of Notion authentication tokens

### Development
- TypeScript implementation with full type safety
- ESLint and Prettier configuration for code quality
- Gulp build system for asset management
- Comprehensive testing environment with n8n integration
- Environment variable management for secure development