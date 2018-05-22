import { notificationDialogActionFactory } from 'wherehows-web/utils/notifications/notifications';
import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';

module('Unit | Utility | notifications/notifications', function(hooks) {
  setupTest(hooks);

  test('it creates expected object properties', function(assert) {
    let result = notificationDialogActionFactory();
    assert.equal(
      Object.keys(result)
        .sort()
        .toString(),
      ['dismissedOrConfirmed', 'dialogActions'].sort().toString(),
      'invocation result is expected shape'
    );

    assert.equal(
      Object.keys(result.dialogActions)
        .sort()
        .toString(),
      ['didDismiss', 'didConfirm'].sort().toString(),
      'dialogActions is expected shape'
    );
  });
});
