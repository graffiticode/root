import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import fs from "fs";
import { setDoc, doc, getDoc, updateDoc, collection, addDoc, deleteDoc } from "firebase/firestore";

const PROJECT_ID = "graffiticode";

const MY_UID = "abc123";
const OTHER_UID = "def456";

describe("firestore/api-keys", () => {
  let testEnv;
  beforeEach(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  it('should not allow writes', async () => {
    const myUser = testEnv.authenticatedContext(MY_UID, { isAdmin: true });

    await assertFails(setDoc(doc(myUser.firestore(), "api-keys/foo"), { uid: MY_UID }));
  });

  it("should allow my user to read ", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await assertSucceeds(setDoc(doc(context.firestore(), "api-keys/foo"), { uid: MY_UID }));
    });
    const myUser = testEnv.authenticatedContext(MY_UID);

    await assertSucceeds(getDoc(doc(myUser.firestore(), "api-keys/foo")));
  });

  it("should not allow other user to read ", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await assertSucceeds(setDoc(doc(context.firestore(), "api-keys/foo"), { uid: MY_UID }));
    });
    const otherUser = testEnv.authenticatedContext(OTHER_UID);

    await assertFails(getDoc(doc(otherUser.firestore(), "api-keys/foo")));
  });

  it("should allow admin user to read ", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await assertSucceeds(setDoc(doc(context.firestore(), "api-keys/foo"), { uid: MY_UID }));
    });
    const otherUser = testEnv.authenticatedContext(OTHER_UID, { isAdmin: true });

    await assertSucceeds(getDoc(doc(otherUser.firestore(), "api-keys/foo")));
  });
});