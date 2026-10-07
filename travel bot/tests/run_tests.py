import glob
import subprocess
import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def main():
    test_files = sorted(glob.glob("tests/test_*.py"))
    print(f"🚀 Running {len(test_files)} test suites in tests/ ...\n")
    
    passed = 0
    failed = 0
    
    env = os.environ.copy()
    env["PYTHONPATH"] = "."
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"

    for t in test_files:
        name = os.path.basename(t)
        res = subprocess.run([sys.executable, t], env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode == 0:
            print(f"  ✅ {name:<35} PASSED")
            passed += 1
        else:
            print(f"  ❌ {name:<35} FAILED ({res.returncode})")
            if res.stderr:
                print(f"     Error: {res.stderr[:200].strip()}")
            failed += 1

    print(f"\n📊 Test Summary: {passed} passed, {failed} failed.")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
