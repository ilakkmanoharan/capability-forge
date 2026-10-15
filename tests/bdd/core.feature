Feature: Safe local capability foundations
  The current executable scenarios cover domain logic and control primitives.
  Browser discovery, replay, and live handoff scenarios remain planned.

  Scenario: Allowed read
    Given an allowed origin, route, and read action
    When a reversible read passes through policy
    Then policy permits it

  Scenario: Risky action
    Given an allowed origin and route
    When an irreversible click passes through policy
    Then policy blocks it

  Scenario: Missing member
    Given a valid synthetic member ID that has no record
    When the member is looked up
    Then the result is member_not_found

  Scenario: Parameterized account lookup
    Given synthetic member 10002
    When Savings is requested
    Then the result is a USD decimal balance of 730.20

  Scenario: Human owns the session
    Given paused automation
    When a human claims control
    Then automation cannot act with its previous token

  Scenario: Return to automation
    Given a human owns the session
    When the human releases control and the caller resumes
    Then a new automation token works and the old token fails
