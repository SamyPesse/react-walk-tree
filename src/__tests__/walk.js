/* @flow */
import * as React from 'react';
import walkTree, { VISIT_REWALK, VISIT_CONTINUE } from '../walk';

class Foo extends React.Component<*, *> {
    props: {
        onReady: () => *
    };

    state = {
        ready: false
    };

    getData = () =>
        new Promise((resolve, reject) => {
            setTimeout(() => {
                this.setState({
                    ready: true
                });

                this.props.onReady();

                resolve();
            }, 10);
        });

    render() {
        const { rest, id, onReady } = this.props;

        if (rest < 0) {
            return 'Done !';
        }

        if (!this.state.ready) {
            return null;
        }

        return (
            <div>
                <Foo id={id + 1} rest={this.props.rest - 1} onReady={onReady} />{' '}
                <Foo id={id + 2} rest={this.props.rest - 1} onReady={onReady} />
            </div>
        );
    }
}

async function visitor(element, instance, context) {
    if (instance && typeof instance.getData) {
        await instance.getData();
        return VISIT_CONTINUE;
    }
    return VISIT_REWALK;
}

describe('walkTree', () => {
    it('should call it for each elements in the tree', async () => {
        let count = 0;
        await walkTree(
            <Foo
                rest={2}
                id={0}
                onReady={() => {
                    count += 1;
                }}
            />,
            visitor
        );

        expect(count).toBe(15);
    });
});
