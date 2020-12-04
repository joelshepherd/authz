import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.79.0/testing/asserts.ts";
import { and, bind, create, not, or } from "./mod.ts";

interface Context {
  permissions: string[];
  userId: number;
}

const context: Context = {
  permissions: ["read"],
  userId: 1,
};

interface Post {
  postId: number;
  userId: number;
  title: string;
}

const mine: Post = {
  userId: 1,
  postId: 1,
  title: "My Post",
};

const other: Post = {
  userId: 2,
  postId: 1,
  title: "Someone else's post",
};

const permission = (required: string) => (context: Context): boolean =>
  context.permissions.includes(required);

// create

const authoriser = create<Context, "read" | "write", Post>({
  action: {
    read: permission("read"),
    write: permission("write"),
  },
  object: {
    read: and(
      permission("read"),
      (context, post) => context.userId === post.userId
    ),
  },
  fields: {
    userId: (context, post) => context.userId === post.userId,
    title: {
      // nonsense to test inverse
      read: (context, post) => post.title !== "My Post",
    },
  },
});

Deno.test("authoriser should resolve an action", function () {
  assert(authoriser(context, "read"));
  assert(!authoriser(context, "write"));
});

Deno.test("authoriser should resolve an object action", function () {
  assert(authoriser(context, "read", mine));
  assert(!authoriser(context, "read", other));
});

Deno.test("authoriser should resolve a field action", function () {
  assert(authoriser(context, "write", mine, "userId"));
  assert(!authoriser(context, "write", other, "userId"));

  // Delibrately inverted
  assert(!authoriser(context, "read", mine, "title"));
  assert(authoriser(context, "read", other, "title"));
});

Deno.test("authoriser should fallback from object to action", function () {
  assertEquals(
    authoriser(context, "write", mine),
    authoriser(context, "write")
  );

  assertEquals(
    authoriser(context, "write", other),
    authoriser(context, "write")
  );
});

Deno.test("authoriser should fallback from field to object", function () {
  assertEquals(
    authoriser(context, "write", mine, "postId"),
    authoriser(context, "write", mine)
  );

  assertEquals(
    authoriser(context, "write", other, "postId"),
    authoriser(context, "write", other)
  );
});

/// bind

Deno.test("bind() sets the context on the authoriser", function () {
  const bound = bind(context, authoriser);

  assertEquals(bound("write"), authoriser(context, "write"));
  assertEquals(bound("read"), authoriser(context, "read"));
});

/// operators

Deno.test("and() should return true when all are true", function () {
  assert(
    and(
      () => true,
      () => true
    )(context, {})
  );
});

Deno.test("and() should return false when any are false", function () {
  assert(
    !and(
      () => true,
      () => false
    )(context, {})
  );
});

Deno.test("or() should return true when any are true", function () {
  assert(
    or(
      () => true,
      () => false
    )(context, {})
  );
});

Deno.test("or() should return false when all are false", function () {
  assert(
    !or(
      () => false,
      () => false
    )(context, {})
  );
});

Deno.test("not() should return true when rule returns false", function () {
  assert(!not(() => true)(context, {}));
});

Deno.test("not() should return false when rule returns true", function () {
  assert(not(() => false)(context, {}));
});
