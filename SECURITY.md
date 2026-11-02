# Security policy

## Supported versions

The latest published minor gets fixes. Older versions are not patched.

## Reporting a vulnerability

Do not open a public issue. Use GitHub private reporting:

<https://github.com/MaximeBoulle/Swarm-Rebuild/security/advisories/new>

Include the affected version, a reproduction, and the impact you expect. You
will get an answer within a few days.

## Scope

The library runs in the page, reads the live DOM and injects a shadow root. The
interesting surface is therefore:

- content copied from the page into the overlay (styles, attributes, media
  sources, `data:` and `blob:` URLs),
- the `placeholder` option, which lets the host inject an image source,
- anything the overlay renders that the page did not ask for.

Out of scope: vulnerabilities in the demo pages' fictional content, and issues
that require an already-compromised page.
