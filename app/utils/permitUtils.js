import { createPermit } from "@/app/lib/permits/createPermit";
import { verifyPermit } from "@/app/lib/permits/verifyPermit";
import { NextRequest, NextResponse } from "next/server";

/**
 * Generates a permit token.
 * @param {string} action - The action the permit allows.
 * @param {string} by - The user ID of the permit creator.
 * @param {string} to - The user ID the permit is for.
 * @param {object} data - Additional data to include in the permit.
 * @param {string} expiresIn - Expiration time for the permit (e.g., "10m").
 * @returns {string} - The generated permit token.
 */
export function generatePermit(action, by, to, data = {}, expiresIn = "10m") {
  return createPermit({ action, by, to, data, expiresIn });
}

/**
 * Verifies a permit token.
 * @param {string} token - The permit token to verify.
 * @returns {object} - The decoded permit data if valid.
 * @throws {Error} - If the token is invalid or expired.
 */
export function validatePermit(token) {
  return verifyPermit(token);
}

/**
 * Generates a permit token from an HTTP request.
 * @param {NextRequest} request - The HTTP request containing permit details in the body.
 * @returns {NextResponse} - The response containing the generated permit token.
 */
export async function handleGeneratePermitRequest(request) {
  try {
    const { action, by, to, data, expiresIn } = await request.json();
    if (!action || !by || !to) {
      return NextResponse.json(
        { message: "Missing required fields: action, by, or to" },
        { status: 400 }
      );
    }

    const token = generatePermit(action, by, to, data, expiresIn);
    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error("Error generating permit:", error);
    return NextResponse.json(
      { message: "Failed to generate permit" },
      { status: 500 }
    );
  }
}

/**
 * Validates a permit token from an HTTP request.
 * @param {NextRequest} request - The HTTP request containing the permit token in the body.
 * @returns {NextResponse} - The response containing the decoded permit data or an error message.
 */
export async function handleValidatePermitRequest(request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json(
        { message: "Missing permit token" },
        { status: 400 }
      );
    }

    const data = validatePermit(token);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error validating permit:", error);
    return NextResponse.json(
      { message: "Invalid or expired permit token" },
      { status: 400 }
    );
  }
}
