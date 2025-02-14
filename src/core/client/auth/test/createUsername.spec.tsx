import { get } from "lodash";
import sinon from "sinon";

import { pureMerge } from "coral-common/utils";
import { act, wait, waitForElement, within } from "coral-framework/testHelpers";

import create from "./create";
import { settings } from "./fixtures";

async function createTestRenderer(
  customResolver: any = {},
  options: { muteNetworkErrors?: boolean; logNetwork?: boolean } = {}
) {
  const resolvers = {
    ...customResolver,
    Query: {
      ...customResolver.Query,
      settings: sinon
        .stub()
        .returns(pureMerge(settings, get(customResolver, "Query.settings"))),
    },
  };

  const { testRenderer, context } = create({
    // Set this to true, to see graphql responses.
    logNetwork: options.logNetwork,
    muteNetworkErrors: options.muteNetworkErrors,
    resolvers,
    initLocalState: (localRecord) => {
      localRecord.setValue("CREATE_USERNAME", "view");
    },
  });
  const container = await waitForElement(() =>
    within(testRenderer.root).getByTestID("createUsername-container")
  );
  const main = within(testRenderer.root).getByTestID(/.*-main/);
  const form = within(main).getByType("form");
  const usernameField = within(form).getByLabelText("Username");

  return {
    context,
    testRenderer,
    form,
    main,
    root: testRenderer.root,
    usernameField,
    container,
  };
}

it("renders createUsername view", async () => {
  const { root } = await createTestRenderer();
  expect(await within(root).axe()).toHaveNoViolations();
});

it("shows server error", async () => {
  const username = "hans";
  const setUsername = sinon.stub().callsFake((_: any, data: any) => {
    throw new Error("server error");
  });
  const { form, usernameField, submitButton } = await act(async () => {
    const { form: f, usernameField: u } = await createTestRenderer(
      {
        Mutation: {
          setUsername,
        },
      },
      { muteNetworkErrors: true }
    );
    const s = f.find((i) => i.type === "button" && i.props.type === "submit");

    return {
      form: f,
      usernameField: u,
      submitButton: s,
    };
  });

  act(() => usernameField.props.onChange({ target: { value: username } }));
  act(() => {
    form.props.onSubmit();
  });
  expect(usernameField.props.disabled).toBe(true);
  expect(submitButton.props.disabled).toBe(true);

  await act(async () => {
    await wait(() => expect(submitButton.props.disabled).toBe(false));
  });
});

it("successfully sets username", async () => {
  const username = "hans";
  const setUsername = sinon.stub().callsFake((_: any, data: any) => {
    expectAndFail(data.input).toEqual({
      username,
      clientMutationId: data.input.clientMutationId,
    });
    return {
      user: {
        id: "me",
        username,
      },
      clientMutationId: data.input.clientMutationId,
    };
  });
  const { form, usernameField, submitButton } = await act(async () => {
    const { form: f, usernameField: u } = await createTestRenderer(
      {
        Mutation: {
          setUsername,
        },
      },
      { muteNetworkErrors: true }
    );
    const s = f.find((i) => i.type === "button" && i.props.type === "submit");

    return {
      form: f,
      usernameField: u,
      submitButton: s,
    };
  });

  act(() => usernameField.props.onChange({ target: { value: username } }));

  act(() => {
    form.props.onSubmit();
  });
  expect(usernameField.props.disabled).toBe(true);
  expect(submitButton.props.disabled).toBe(true);

  await act(async () => {
    await wait(() => expect(submitButton.props.disabled).toBe(false));
  });

  expect(setUsername.called).toBe(true);
});
