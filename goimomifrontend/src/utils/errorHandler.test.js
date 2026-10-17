import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatApiError } from './errorHandler.js';

test('formatApiError handles HTTP 413 Request Entity Too Large without string splitting', () => {
  const nginxHtmlError = {
    response: {
      status: 413,
      statusText: 'Request Entity Too Large',
      data: '<html><head><title>413 Request Entity Too Large</title></head><body><center><h1>413 Request Entity Too Large</h1></center><hr><center>nginx</center></body></html>',
    },
  };

  const msg = formatApiError(nginxHtmlError);
  assert.ok(msg.includes('Upload size is too large'));
  assert.ok(!msg.includes('0: <'));
  assert.ok(!msg.includes('1: h'));
});

test('formatApiError handles generic HTML error pages safely', () => {
  const html500Error = {
    response: {
      status: 500,
      statusText: 'Internal Server Error',
      data: '<!DOCTYPE html><html><body>Server crashed</body></html>',
    },
  };

  const msg = formatApiError(html500Error);
  assert.equal(msg, 'Server error (500 Internal Server Error). Please verify form fields and file sizes.');
});

test('formatApiError formats DRF field validation error dictionary', () => {
  const drfError = {
    response: {
      status: 400,
      data: {
        title: ['This field is required.'],
        price: ['Ensure this value is greater than 0.'],
      },
    },
  };

  const msg = formatApiError(drfError);
  assert.equal(msg, 'Title: This field is required. | Price: Ensure this value is greater than 0.');
});

test('formatApiError handles detail and error keys in JSON response', () => {
  const detailErr = {
    response: {
      status: 403,
      data: { detail: 'You do not have permission to perform this action.' },
    },
  };
  assert.equal(formatApiError(detailErr), 'You do not have permission to perform this action.');

  const errorErr = {
    response: {
      status: 400,
      data: { error: 'Invalid product category specified.' },
    },
  };
  assert.equal(formatApiError(errorErr), 'Invalid product category specified.');
});

test('formatApiError falls back gracefully when network fails without response', () => {
  const netErr = new Error('Network Error');
  assert.equal(formatApiError(netErr), 'Network Error');
  assert.equal(formatApiError(null, 'Custom fallback'), 'Custom fallback');
});
