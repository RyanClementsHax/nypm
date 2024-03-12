import {
  executeCommand,
  resolveOperationOptions,
  getWorkspaceArgs,
  doesDependencyExist,
} from "./_utils";
import type { OperationOptions, PackageManagerName } from "./types";

/**
 * Installs project dependencies.
 *
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.silent - Whether to run the command in silent mode.
 * @param options.packageManager - The package manager info to use (auto-detected).
 * @param options.frozenLockFile - Whether to install dependencies with frozen lock file.
 */
export async function installDependencies(
  options: Pick<OperationOptions, "cwd" | "silent" | "packageManager"> & {
    frozenLockFile?: boolean;
  } = {},
) {
  const resolvedOptions = await resolveOperationOptions(options);

  const pmToInstallCommandMap: Record<PackageManagerName, string[]> = {
    npm: ["ci"],
    yarn: ["install", "--immutable"],
    bun: ["install", "--frozen-lockfile"],
    pnpm: ["install", "--frozen-lockfile"],
  };

  const commandArgs = options.frozenLockFile
    ? pmToInstallCommandMap[resolvedOptions.packageManager.name]
    : ["install"];

  await executeCommand(resolvedOptions.packageManager.command, commandArgs, {
    cwd: resolvedOptions.cwd,
    silent: resolvedOptions.silent,
  });
}

/**
 * Adds dependency to the project.
 *
 * @param name - Name of the dependency to add.
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.silent - Whether to run the command in silent mode.
 * @param options.packageManager - The package manager info to use (auto-detected).
 * @param options.dev - Whether to add the dependency as dev dependency.
 * @param options.workspace - The name of the workspace to use.
 * @param options.global - Whether to run the command in global mode.
 */
export async function addDependency(
  name: string | string[],
  options: OperationOptions = {},
) {
  const resolvedOptions = await resolveOperationOptions(options);

  const names = Array.isArray(name) ? name : [name];

  const args = (
    resolvedOptions.packageManager.name === "yarn"
      ? [
          ...getWorkspaceArgs(resolvedOptions),
          // Global is not supported in berry: yarnpkg/berry#821
          resolvedOptions.global &&
          resolvedOptions.packageManager.majorVersion === "1"
            ? "global"
            : "",
          "add",
          resolvedOptions.dev ? "-D" : "",
          ...names,
        ]
      : [
          resolvedOptions.packageManager.name === "npm" ? "install" : "add",
          ...getWorkspaceArgs(resolvedOptions),
          resolvedOptions.dev ? "-D" : "",
          resolvedOptions.global ? "-g" : "",
          ...names,
        ]
  ).filter(Boolean);

  await executeCommand(resolvedOptions.packageManager.command, args, {
    cwd: resolvedOptions.cwd,
    silent: resolvedOptions.silent,
  });
}

/**
 * Adds dev dependency to the project.
 *
 * @param name - Name of the dev dependency to add.
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.silent - Whether to run the command in silent mode.
 * @param options.packageManager - The package manager info to use (auto-detected).
 * @param options.workspace - The name of the workspace to use.
 * @param options.global - Whether to run the command in global mode.
 *
 */
export async function addDevDependency(
  name: string | string[],
  options: Omit<OperationOptions, "dev"> = {},
) {
  await addDependency(name, { ...options, dev: true });
}

/**
 * Removes dependency from the project.
 *
 * @param name - Name of the dependency to remove.
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.silent - Whether to run the command in silent mode.
 * @param options.packageManager - The package manager info to use (auto-detected).
 * @param options.dev - Whether to remove dev dependency.
 * @param options.workspace - The name of the workspace to use.
 * @param options.global - Whether to run the command in global mode.
 */
export async function removeDependency(
  name: string,
  options: OperationOptions = {},
) {
  const resolvedOptions = await resolveOperationOptions(options);

  const args = (
    resolvedOptions.packageManager.name === "yarn"
      ? [
          // Global is not supported in berry: yarnpkg/berry#821
          resolvedOptions.global &&
          resolvedOptions.packageManager.majorVersion === "1"
            ? "global"
            : "",
          ...getWorkspaceArgs(resolvedOptions),
          "remove",
          resolvedOptions.dev ? "-D" : "",
          resolvedOptions.global ? "-g" : "",
          name,
        ]
      : [
          resolvedOptions.packageManager.name === "npm"
            ? "uninstall"
            : "remove",
          ...getWorkspaceArgs(resolvedOptions),
          resolvedOptions.dev ? "-D" : "",
          resolvedOptions.global ? "-g" : "",
          name,
        ]
  ).filter(Boolean);

  await executeCommand(resolvedOptions.packageManager.command, args, {
    cwd: resolvedOptions.cwd,
    silent: resolvedOptions.silent,
  });
}

/**
 * Ensures dependency is installed.
 *
 * @param name - Name of the dependency.
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.dev - Whether to install as dev dependency (if not already installed).
 * @param options.workspace - The name of the workspace to install dependency in (if not already installed).
 */
export async function ensureDependencyInstalled(
  name: string,
  options: Pick<OperationOptions, "cwd" | "dev" | "workspace"> = {},
) {
  const resolvedOptions = await resolveOperationOptions(options);

  const dependencyExists = doesDependencyExist(name, resolvedOptions);

  if (dependencyExists) {
    return true;
  }

  await addDependency(name, resolvedOptions);
}
