export interface Rule<C, T = void> {
  /**
   * A rule to check authorisation.
   */
  (context: C, root: T): boolean;
}

export interface Authoriser<C, A extends string, T> {
  /**
   * Authorise a user's actions.
   *
   *
   *    // user can perform write
   *    authoriser(context, "write")
   *
   *    // user can perform write on this object
   *    authoriser(context, "write", object)
   *
   *    // user can perform write on this object's name field
   *    authoriser(context, "write", object, "name")
   */
  (context: C, action: A, object?: T, field?: keyof T): boolean;
}

interface Options<C, A extends string, T> {
  action: {
    [K in A]: Rule<C, void>;
  };
  object?: {
    [K in A]?: Rule<C, T>;
  };
  fields?: {
    [K in keyof T]?:
      | Rule<C, T>
      | {
          [K in A]?: Rule<C, T>;
        };
  };
}

/**
 * Create a new authoriser with the specified rules.
 */
export function create<C, A extends string, T>(
  opts: Options<C, A, T>
): Authoriser<C, A, T> {
  function _action(context: C, action: A): boolean {
    return opts.action[action](context);
  }

  function _object(context: C, action: A, root: T): boolean {
    return opts.object?.[action]?.(context, root) ?? _action(context, action);
  }

  function _field(context: C, action: A, root: T, field: keyof T): boolean {
    if (opts.fields && field in opts.fields) {
      let resolver = opts.fields[field];
      if (typeof resolver === "object") {
        resolver = resolver[action];
        if (resolver) {
          return resolver(context, root);
        }
      } else if (typeof resolver === "function") {
        return resolver(context, root);
      }
    }
    return _object(context, action, root);
  }

  return function authoriser(context, action, object, field): boolean {
    if (object && field) return _field(context, action, object, field);
    if (object) return _object(context, action, object);
    return _action(context, action);
  };
}

/**
 * Binds the context into an authoriser.
 *
 *    const authoriser = create(...{});
 *    req.authoriser = bind(req, authoriser);
 */
export function bind<T, A extends unknown[], R>(
  context: T,
  fn: (context: T, ...args: A) => R
) {
  return (...args: A) => fn(context, ...args);
}

/**
 * Create a rule that combines multiple rules with an **and** operator.
 *
 *    // Is a user an editor and owns the article
 *    const canEdit = and(isEditor, isArticleOwner);
 */
export function and<C, T>(...rules: Rule<C, T>[]): Rule<C, T> {
  return (...args) => rules.every((rule) => rule(...args));
}

/**
 * Create a rule that combines multiple rules with an **or** operator.
 *
 *    // Is the user an admin or editor
 *    const isEditor = or(isAdmin, isEditor);
 */
export function or<C, T>(...rules: Rule<C, T>[]): Rule<C, T> {
  return (...args) => rules.some((rule) => rule(...args));
}

/**
 * Create a rule that is the inverse of its containing rule.
 *
 *    // Is the user is not an admin
 *    const isNotAdmin = not(isAdmin);
 */
export function not<C, T>(rule: Rule<C, T>): Rule<C, T> {
  return (...args) => !rule(...args);
}
