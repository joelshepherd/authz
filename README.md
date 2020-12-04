# authz

A deno module that provides a functional interface for defining action, object, and field-level authorisation rules.

No dependencies, 100% test coverage.

## Usage

### Creating an authoriser

```ts
const authoriser = create({
  action: {
    read: () => true,
    write: (context) => context.role === "writer",
  },
  object: {
    // read falls back to action-level
    write: and(
      (context) => context.role === "writer",
      (context, post) => context.user === post.user
    ),
  },
});
```

### Using an authoriser

```ts
if (authoriser(context, "write")) {
  // user can perform write
}

if (authoriser(context, "write", object)) {
  // User can perform write on this object
}

if (authoriser(context, "write", object, "name")) {
  // User can perform write on this object's name field
}
```

### Rule and other helpers

```ts
const allRules = and(...rules);
const anyRule = or(...rules);
const notRule = not(rule);

const boundAuthoriser = bind(context, authoriser);
boundAuthoriser("read"); // no need to specify the context anymore
```
