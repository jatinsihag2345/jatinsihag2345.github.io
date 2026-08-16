/**
 * DevOps content registry — the DevOps counterpart of coreSubjects.ts.
 *
 * Lands at: src/data/devopsSubjects.ts  (content files at src/data/devops/*.json)
 *
 * These reuse Core CS's shape and its renderer: CoreHub takes `subjects` and an
 * `idPrefix`, so DevOpsHub is a four-line wrapper rather than a second copy of a
 * 645-line component. The prefix is 'devops', which keeps flashcard review ids
 * (`devops-<subjectId>-card-<index>`) in their own namespace — a DevOps deck and a
 * Core CS deck can never collide in the shared review ledger.
 *
 * ORDER IS A LEARNING PATH, not alphabetical: the machine and the version control
 * first, then the network those machines talk over, then containers and their
 * orchestrator, then the pipeline that ships them. Everything after that assumes
 * you already know what a container and a pipeline are.
 *
 * ADDING A SUBJECT: drop the JSON in src/data/devops/, import it, add one load()
 * line. Nothing else changes — the hub is fully data-driven. Ids are identity for
 * review grades, so never rename one; add a new id instead.
 */
import type { CoreSubject, CoreSubjectContent } from './coreSubjects';

import linuxJson from './devops/linux.json';
import gitJson from './devops/git.json';
import networkingJson from './devops/networking.json';
import dockerJson from './devops/docker.json';
import kubernetesJson from './devops/kubernetes.json';
import cicdJson from './devops/cicd.json';
import terraformJson from './devops/terraform.json';
import ansibleJson from './devops/ansible.json';
import awsJson from './devops/aws.json';
import observabilityJson from './devops/observability.json';
import sreJson from './devops/sre.json';
import securityJson from './devops/security.json';
import scriptingJson from './devops/scripting.json';
import systemDesignJson from './devops/system-design.json';

// Same single-cast-site pattern as coreSubjects.ts: json-modules.d.ts types every
// JSON import as `any` (literal-typing multi-MB content costs minutes per build),
// so this is the one place the real interface gets pinned on.
const load = (id: string, label: string, raw: CoreSubjectContent): CoreSubject => ({
  id,
  label,
  ...raw,
});

export const devopsSubjects: CoreSubject[] = [
  // The box and the history of what is on it.
  load('linux', 'Linux', linuxJson),
  load('git', 'Git', gitJson),
  // How boxes reach each other — assumed by everything below.
  load('networking', 'Networking', networkingJson),
  // Packaging, then scheduling the packages.
  load('docker', 'Docker', dockerJson),
  load('kubernetes', 'Kubernetes', kubernetesJson),
  // Getting code to those machines.
  load('cicd', 'CI/CD', cicdJson),
  load('terraform', 'Terraform', terraformJson),
  load('ansible', 'Ansible', ansibleJson),
  load('aws', 'AWS', awsJson),
  // Running it once it is out there.
  load('observability', 'Observability', observabilityJson),
  load('sre', 'SRE', sreJson),
  load('security', 'DevSecOps', securityJson),
  // Cross-cutting craft.
  load('scripting', 'Scripting', scriptingJson),
  load('system-design', 'Scale', systemDesignJson),
];
