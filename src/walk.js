/* @flow */
import * as React from 'react';

type ReactContext = Object;

// Stop and do not walk this element and its children
const VISIT_STOP = false;
// Rewalk this element
const VISIT_REWALK = true;
// Continue normally over children
const VISIT_CONTINUE = null;

type WalkResult =
    | typeof VISIT_STOP
    | typeof VISIT_REWALK
    | typeof VISIT_CONTINUE;

/*
 * Walk a react element.
 */
async function walkTree(
    // React element to walk
    element: React.Element<*>,
    // Function to execute on all element
    visitor: (
        el: React.Element<*>,
        instance: ?React.Component<*, *>,
        context: ReactContext
    ) => WalkResult | Promise<WalkResult>,
    // Context being passed to react constructors
    context: ?ReactContext,
    // Should visitor be called on the root element
    visitRoot: boolean = true
): Promise<void> {
    if (Array.isArray(element)) {
        await Promise.all(
            element.map(child => walkTree(child, visitor, context))
        );

        return;
    }

    if (!element) {
        return;
    }

    const Component = element.type;

    // a stateless functional component or a class
    if (typeof Component === 'function') {
        const props = Object.assign({}, Component.defaultProps, element.props);
        let childContext = context;
        let instance = null;
        let render = () => null;
        let unmount = () => {};

        // Are we are a react class?
        if (Component.prototype && Component.prototype.isReactComponent) {
            instance = new Component(props, context);

            // In case the user doesn't pass these to super in the constructor
            instance.props = instance.props || props;
            instance.context = instance.context || context;
            // set the instance state to null (not undefined) if not set, to match React behaviour
            instance.state = instance.state || null;

            // Override setState to just change the state, not queue up an update.
            //   (we can't do the default React thing as we aren't mounted "properly"
            //   however, we don't need to re-render as well only support setState in
            //   componentWillMount, which happens *before* render).
            instance.setState = newStateFn => {
                let newState = newStateFn;

                if (typeof newStateFn === 'function') {
                    newState = newStateFn(
                        instance.state,
                        instance.props,
                        instance.context
                    );
                }
                instance.state = Object.assign({}, instance.state, newState);
            };

            if (instance.componentWillMount) {
                instance.componentWillMount();
            }

            if (instance.getChildContext) {
                childContext = Object.assign(
                    {},
                    context,
                    instance.getChildContext()
                );
            }

            render = () => instance.render();

            if (instance.componentWillUnmount) {
                unmount = () => {
                    instance.componentWillUnmount();
                };
            }
        } else {
            // just a stateless functional
            render = () => Component(props, context);
        }

        const visitResult = visitRoot
            ? await visitor(element, instance, context)
            : VISIT_CONTINUE;

        if (visitResult == VISIT_STOP) {
            return;
        }

        if (visitResult == VISIT_REWALK) {
            await walkTree(element, visitor, context, false);
            return;
        }

        const child = render();

        // Traverse children
        await walkTree(child, visitor, childContext);

        // After all children, we call unmount
        try {
            unmount();
        } catch (err) {
            // This is an experimental feature, we don't want to break
            // the bootstrapping process, but lets warn the user it
            // occurred.
            console.warn(
                'Error calling componentWillUnmount whilst walking your react tree'
            );
            console.warn(err);
        }
    } else {
        // a basic string or dom element, just get children
        if ((await visitor(element, null, context)) === false) {
            return;
        }

        if (element.props && element.props.children) {
            const pending = [];

            React.Children.forEach(
                element.props.children,
                (child: React.Element<*>) => {
                    pending.push(walkTree(child, visitor, context));
                }
            );

            await Promise.all(pending);
        }
    }
}

export default walkTree;
export { VISIT_STOP, VISIT_REWALK, VISIT_CONTINUE };
