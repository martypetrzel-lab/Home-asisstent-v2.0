import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { relayRequestId } from "../src/lib/relay-request-id";

test("relay command identifiers work with LAN HTTP crypto without randomUUID", () => {
  const httpCrypto = {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  } as Pick<Crypto, "getRandomValues">;
  const ids = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const id = relayRequestId(httpCrypto);
    assert.match(id, /^[a-zA-Z0-9_-]{1,40}$/);
    ids.add(id);
  }
  assert.equal(ids.size, 1000);
});
