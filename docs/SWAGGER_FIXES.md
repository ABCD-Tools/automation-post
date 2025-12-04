# Swagger Documentation Fixes

## Changes Made

### 1. Added Swagger Annotations to Authentication APIs

**Files Updated:**
- `pages/api/auth/register.js` - Added full Swagger documentation
- `pages/api/auth/login.js` - Added full Swagger documentation  
- `pages/api/auth/verify.js` - Added Swagger documentation

**Details:**
- All endpoints now have complete OpenAPI 3.0 annotations
- Request/response schemas defined
- Error responses documented
- Tagged under "Authentication" category

### 2. Added Swagger Annotations to Posts APIs

**Files Updated:**
- `pages/api/posts/create.js` - Added full Swagger documentation
- `pages/api/posts/upload.js` - Added full Swagger documentation

**Details:**
- Complete request/response schemas
- Security requirements (bearerAuth) documented
- File upload schema for image upload endpoint
- Tagged under "Posts" category

### 3. Account APIs

**Status:** ✅ Already had Swagger annotations
- `pages/api/accounts/add.js`
- `pages/api/accounts/list.js`
- `pages/api/accounts/verify.js`

### 4. Improved Spec Generation

**File Updated:** `pages/api/docs/spec.js`

**Improvements:**
- Added error handling for spec generation
- Added fallback paths for file scanning (absolute and relative)
- Enhanced security scheme descriptions
- Added Error schema to components
- Better error messages

## Testing

To verify all endpoints appear in SwaggerUI:

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Navigate to: `http://localhost:3000/api/docs`

3. Check that all sections appear:
   - ✅ Authentication (3 endpoints)
   - ✅ Accounts (3 endpoints)
   - ✅ Posts (2 endpoints)

## Troubleshooting

If endpoints still don't appear:

1. **Check file paths**: The spec generator uses:
   - `path.join(process.cwd(), 'pages/api/**/*.js')` (absolute)
   - `'./pages/api/**/*.js'` (relative fallback)

2. **Verify annotations**: Ensure all API files have `@swagger` JSDoc comments before the handler function

3. **Check console**: Look for "Swagger spec generation error" in server logs

4. **Manual test**: Visit `http://localhost:3000/api/docs/spec` to see the raw JSON spec

## File Structure

All API files should follow this pattern:

```javascript
/**
 * @swagger
 * /api/endpoint:
 *   method:
 *     summary: Description
 *     tags: [TagName]
 *     ...
 */
export default async function handler(req, res) {
  // Implementation
}
```

## Next Steps

To add more endpoints to Swagger:

1. Add `@swagger` JSDoc comments to the API file
2. Follow OpenAPI 3.0 specification
3. Use appropriate tags (Authentication, Accounts, Posts, Jobs, Client, etc.)
4. Include request/response schemas
5. Document security requirements

## References

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)

