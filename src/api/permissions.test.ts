import { describe, expect, it } from 'vitest';
import { Permissions, readClaimValues } from './permissions';

describe('readClaimValues', () => {
  it('normalises the three shapes a repeated JWT claim can take', () => {
    expect(readClaimValues(undefined)).toEqual([]);
    expect(readClaimValues(Permissions.ManageUsers)).toEqual(['users.manage']);
    expect(
      readClaimValues([Permissions.ManageUsers, Permissions.SendNotifications])
    ).toEqual(['users.manage', 'notifications.send']);
  });

  it('drops non-string entries rather than passing them through', () => {
    expect(readClaimValues(['users.manage', 7, null])).toEqual([
      'users.manage'
    ]);
    expect(readClaimValues(42)).toEqual([]);
  });
});
