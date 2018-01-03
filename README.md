# `react-walk-tree`

Asynchronously walk a React element tree.

This module is based on [`react-tree-walker`](https://github.com/ctrlplusb/react-tree-walker) and the Apollo's implementation ([`react-apollo`](https://github.com/apollographql/react-apollo/blob/master/src/getDataFromTree.ts)).

This modified version is asynchronous as `react-tree-walker`, but contains some fixes related to React lifecycle (`componentWillUnmount` is called after children are unmounted, and `setState` supports the functional version), and an optional result `VISIT_REWALK` to re-walk the same element.

## Example

```js
import walkTree, { VISIT_CONTINUE, VISIT_STOP, VISIT_REWALK } from 'react-walk-tree';

class Foo extends React.Component {
  constructor(props) {
    super(props);
    this.getData = this.getData.bind(this);
  }

  async getData() {
    // Return a promise or a sync value  
    return Promise.resolve(this.props.value);
  }

  render() {
    return <div>{this.props.children}</div>;
  }
}

const app = (
  <div>
    <h1>Hello World!</h1>
    <Foo value={1} />
    <Foo value={2}>
      <Foo value={4}>
        <Foo value={5} />
      </Foo>
    </Foo>
    <Foo value={3} />
  </div>
);

const values = [];

/**
 * Visitor to be executed on each element being walked.
 *
 * @param  element - The current element being walked.
 * @param  instance - If the current element is a Component or PureComponent
 *                    then this will hold the reference to the created
 *                    instance. For any other element type this will be null.
 * @param  context - The current "React Context". Any provided childContexTypes
 *                   will be passed down the tree.
 *
 * @return `VISIT_CONTINUE` to continue walking down the current branch,
 *         OR
 *         `VISIT_STOP` if you wish to stop the traversal down the current branch,
 *         OR
 *         `VISIT_REWALK` if you wish to rewalk the same element without visting it.
 *         It can be used to refresh the state.
 */
async function visitor(element, instance, context) {
  if (instance && typeof instance.getData) {
    const value = await instance.getData();

    return value > 4 ? VISIT_STOP : VISIT_CONTINUE;
  }
  return true
}

await reactTreeWalker(app, visitor);
```
