import json
import subprocess
import sys
import unittest
from quantum_worker.main import handle
from quantum_worker.contracts import validate

class ProtocolTests(unittest.TestCase):
    def call(self, method, params=None):
        return handle(json.dumps({"jsonrpc":"2.0", "id":"test", "method":method, "params":params or {}}))

    def test_handshake_and_health(self):
        self.assertEqual(self.call("hello")[0]["result"]["protocol"], 1)
        validate("worker-capabilities", self.call("capabilities")[0]["result"])
        self.assertEqual(self.call("health")[0]["result"]["status"], "ok")
        self.assertTrue(self.call("shutdown")[1])

    def test_errors_and_notifications(self):
        self.assertEqual(handle("{")[0]["error"]["code"], -32700)
        self.assertEqual(handle("[]")[0]["error"]["code"], -32600)
        self.assertEqual(self.call("unknown")[0]["error"]["code"], -32601)
        self.assertIsNone(handle('{"jsonrpc":"2.0","method":"health"}')[0])
        self.assertEqual(handle('{"jsonrpc":"2.0","id":1,"method":"hello","params":[]}')[0]["error"]["code"], -32602)

    def test_real_stdio_and_clean_shutdown(self):
        requests = [json.dumps({"jsonrpc":"2.0","id":str(i),"method":method}) for i, method in enumerate(["hello","capabilities","health","shutdown"])]
        result = subprocess.run([sys.executable,"-u","-m","quantum_worker.main"],input="\n".join(requests)+"\n",text=True,capture_output=True,timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        responses = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual([r["id"] for r in responses], ["0","1","2","3"])

if __name__ == "__main__":
    unittest.main()
