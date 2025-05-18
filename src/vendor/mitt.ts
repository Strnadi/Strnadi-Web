export type EventType = string | symbol;

// An event handler can take an optional event argument
// and should not return a value
export type Handler<T = unknown> = (event: T) => boolean | void;
export type WildcardHandler<T = Record<string, unknown>> = (
	type: keyof T,
	event: T[keyof T]
) => boolean | void;

// An array of all currently registered event handlers for a type
export type EventHandlerList<T = unknown> = Handler<T>[];
export type WildCardEventHandlerList<T = Record<string, unknown>> = WildcardHandler<T>[];

// A map of event types and their corresponding event handlers.
export type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<
	keyof Events | '*',
	EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>;

export interface Emitter<Events extends Record<EventType, unknown>> {
	all: EventHandlerMap<Events>;

	on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
	on(type: '*', handler: WildcardHandler<Events>): void;

	off<Key extends keyof Events>(
		type: Key,
		handler?: Handler<Events[Key]>
	): void;
	off(type: '*', handler: WildcardHandler<Events>): void;

	emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
	emit<Key extends keyof Events>(
		type: undefined extends Events[Key] ? Key : never
	): void;

	// Add last() overloads
	last<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
	last(type: '*', handler: WildcardHandler<Events>): void;
}

/**
 * Mitt: Tiny functional event emitter / pubsub.
 * @name mitt
 * @returns {Mitt}
 */
export default function mitt<Events extends Record<EventType, unknown>>(
	all?: EventHandlerMap<Events>
): Emitter<Events> {
	type GenericEventHandler =
		| Handler<Events[keyof Events]>
		| WildcardHandler<Events>;
	all = all ?? new Map();

	// store last callbacks separately
	const lastAll: EventHandlerMap<Events> = new Map();

	return {
		/**
		 * A Map of event names to registered handler functions.
		 */
		all,

		/**
		 * Register an event handler for the given type.
		 * @param {string|symbol} type Type of event to listen for, or `'*'` for all events
		 * @param {Function} handler Function to call in response to given event
		 * @memberOf mitt
		 */
    on(type: keyof Events | '*', handler: GenericEventHandler): void {
      const handlers = all.get(type);
      if (handlers) {
        handlers.push(handler);
      } else {
        all.set(type, [handler] as any);
      }
    },

		/**
		 * Remove an event handler for the given type.
		 * If `handler` is omitted, all handlers of the given type are removed.
		 * @param {string|symbol} type Type of event to unregister `handler` from (`'*'` to remove a wildcard handler)
		 * @param {Function} [handler] Handler function to remove
		 * @memberOf mitt
		 */
		off<Key extends keyof Events>(type: Key, handler?: GenericEventHandler) {
			const handlers: GenericEventHandler[] | undefined = all.get(type);
			if (handlers) {
				if (handler) {
					handlers.splice(handlers.indexOf(handler) >>> 0, 1);
				} else {
					all.set(type, []);
				}
			}
		},

		/**
		 * Register a last-handler for the given type.
		 * @param {string|symbol} type Type of event to listen for, or `'*'` for all events
		 * @param {Function} handler Function to call in response to given event
		 * @memberOf mitt
		 */
		last<Key extends keyof Events>(type: Key, handler: GenericEventHandler) {
			const list = lastAll.get(type);
			if (list) {
				(list as any).push(handler);
			} else {
				lastAll.set(type, [handler] as EventHandlerList<Events[keyof Events]>);
			}
		},

		/**
		 * Invoke all handlers for the given type.
		 * If present, `'*'` handlers are invoked after type-matched handlers.
		 *
		 * Note: Manually firing '*' handlers is not supported.
		 *
		 * @param {string|symbol} type The event type to invoke
		 * @param {Any} [evt] Any value (object is recommended and powerful), passed to each handler
		 * @memberOf mitt
		 */
		emit<Key extends keyof Events>(type: Key, evt?: Events[Key]) {
			let cancelled = false;
			let handlers = all.get(type);
			if (handlers) {
				for (const h of (handlers as EventHandlerList<Events[keyof Events]>).slice()) {
					if (h(evt!) === false) {
						cancelled = true;
						break;
					}
				}
			}

			if (!cancelled) {
				handlers = all.get('*');
				if (handlers) {
					for (const h of (handlers as WildCardEventHandlerList<Events>).slice()) {
						if (h(type, evt!) === false) {
							cancelled = true;
							break;
						}
					}
				}
			}

			// only run last-handlers if not cancelled
			if (!cancelled) {
				let lastHandlers = lastAll.get(type);
				if (lastHandlers) {
					for (const h of (lastHandlers as EventHandlerList<Events[keyof Events]>).slice()) {
						h(evt!);
					}
				}
				lastHandlers = lastAll.get('*');
				if (lastHandlers) {
					for (const h of (lastHandlers as WildCardEventHandlerList<Events>).slice()) {
						h(type, evt!);
					}
				}
			}
		}
	};
}
