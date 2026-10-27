# Image source boundary: CodeQL js/xss-through-dom

## Observed path

GitHub alert #1 identifies DOM input `event.target.value` → the legacy product editor state/sanitizer → `editor.preview` → the image `src` in ProductEditor. The SARIF code flow was retrieved from GitHub before editing. The old sanitizer returned arbitrary blob strings and any HTTPS source, without ownership or origin checks. This establishes the reported data flow; it is not a claim that an HTML-attribute payload was observed executing in React.

## Correction

`shared/imageSource.ts` parses URLs and checks protocol, credentials, exact origins, encoded controls/backslashes/HTML delimiters, protocol-relative URLs and fragments. It reconstructs path/query components using URL encoding instead of returning the input string. Non-string sources, data URLs and unowned blobs are rejected.

`src/shared/lib/imageSource.ts` owns a private registry of local preview URLs. Only PNG/JPEG/WebP Files of allowed size can create entries through URL.createObjectURL. Arbitrary pasted or persisted blob strings cannot register themselves. Replacing, clearing and unmounting the editor release owned URLs, and released URLs no longer pass the boundary. No remote URL is revoked.

`SafeImage` applies the boundary to the legacy editor and product list, product/model/variant galleries, wizard/imported-model review, inventory, cart and public catalog. The public-read check after an upload uses the same policy, including deduplicated objects. Static authored brand artwork is unchanged. No HTML rendering API, CodeQL suppression, database migration or dependency was added.

## Allowed origins and compatibility

Same-origin paths, including `/images/`, `/brand/`, `/media/products/` and the legacy `/api/products/:id/image` endpoint, remain supported. R2 behind the existing Pages binding is same-origin and needs no additional configuration. The configured VITE_SITE_URL is also an approved public site origin.

If product images genuinely live on a separate public HTTPS origin, add it explicitly to **VITE_IMAGE_ORIGINS** in the frontend build configuration, comma-separated. Origins must be exact HTTPS scheme/host/port combinations without credentials, paths, query, fragments or wildcards. This variable contains public origins only; never S3 credentials or private API endpoints. Its build validation and client-secret allowlist are updated. Existing unapproved external references render the standard placeholder rather than being trusted merely because they use HTTPS.

R2 signing, uploads, object validation, database storage, authentication and server deployment are unchanged. The PUT URL is not an image preview and retains its signed query parameters; only public image-reading URLs cross the image-source boundary.

## Validation

Tests cover allowed self/R2/CDN paths, query parameters and encoded filenames, malicious protocols/data/SVG, credentials, host-prefix tricks, ports, controls, multiple encoding, forged blobs, ownership/revocation/replacement and poisoned persisted thumbnail data. Component rendering verifies rejected sources become the existing placeholder. Existing photo upload/public-read tests still exercise the same boundary.

GitHub CodeQL on the pull request is the authoritative follow-up static analysis. Do not mark the original main alert fixed or merge until that check has run for this commit. No production deployment or migration is part of this PR.

Reference: [CodeQL js/xss-through-dom](https://codeql.github.com/codeql-query-help/javascript/js-xss-through-dom/).
