import { and, bind, create, Rule } from "../mod.ts";

type Role = "reader" | "editor";

interface Context {
  userId: number;
  role: Role;
}

interface Post {
  id: number;
  ownerId: number;
  title: string;
  published: boolean;
}

type BaseRule = Rule<Context, unknown>;
type PostRule = Rule<Context, Post>;

// Setup the rules and create your authoriser:

// A rule factory function
const isRole = (role: Role): BaseRule => (context) => context.role === role;

// A rule that only checks the object
const isPublished: PostRule = (_, post) => post.published;

// A rule that compares the context to the object
const isOwner: PostRule = (context, post) => context.userId === post.ownerId;

// Create your authoriser function
const authoriser = create({
  action: {
    read: () => true,
    write: isRole("editor"),
  },
  object: {
    read: isPublished,
    write: and(isOwner, isRole("editor")),
  },
});

// Using the authoriser function you just created:

const context: Context = {
  userId: 1234,
  role: "editor",
};

const post: Post = {
  id: 4321,
  ownerId: 1234,
  published: true,
  title: "Hello World",
};

if (authoriser(context, "write")) {
  // This user can create posts
  // Show a "create post" button
}

if (authoriser(context, "write", post)) {
  // This user can write this post
  // Show an "edit post" button for this post
}

// Bind the context so you don't need to set it everytime:

const can = bind(context, authoriser);

if (can("read", post)) {
  // This user can read this post
  // Show the post to them!
}
