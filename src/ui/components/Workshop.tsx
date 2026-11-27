import { MATERIALS } from '../../content/materials';
import { ResearchPreview } from './research/preview';
import { useResearchUnlocked } from './hud/tabs';
import { AUTOMATIONS } from '../../content/tree';
import { has } from '../../core/state';
import { MODELS } from '../../content/models';
import { qualityUnlocked } from '../../systems/printQuality';
import { designVisible } from '../../systems/models';
import { mobileView, useS } from '../store';
import { PrestigeCard } from './Prestige';
import { Automation } from './workshop/automation';
import { Energy } from './workshop/energy';
import { Investments } from './workshop/investments';
import { Materials } from './workshop/materials';
import { PrintQuality } from './workshop/printQuality';
import { ProductionLine } from './workshop/productionLine';
import { Sales } from './workshop/sales';
import { Space } from './workshop/space';

/** Research, equipment, power and automation: always visible, no collapsible wrapper. */
function WorkshopSupport({ research, farm }: { research: boolean; farm: boolean }) {
  return (
    <div class="workshop-support">
      <div class="workshop-stack">
        {research && <ResearchPreview />}
        <PrintQuality />
        {farm && <Energy />}
        <Automation />
      </div>
    </div>
  );
}

export function Workshop() {
  const v = useS(s => ({
    sp: s.ph === 2, sales: s.goal >= 1, farm: s.farmOn,
    designs: MODELS.some(m => m.design > 0 && designVisible(s, m)) || s.total >= MATERIALS[1].unlockAt,
    support: qualityUnlocked(s) || s.farmOn || AUTOMATIONS.some(id => has(s, id)),
  }));
  const research = useResearchUnlocked();

  if (v.sp) return (
    <div>
      <div class="grid">
        {research && <ResearchPreview />}
        <Space />
        <PrestigeCard />
        <Automation />
      </div>
    </div>
  );

  const support = research || v.support;
  return (
    <div class="workshop-layout" data-view={mobileView.value}>
      <div class="workshop-board">
        <div class="workshop-core">
          <ProductionLine />
          <div class="core-pair">
            {v.sales && <Sales />}
            <Investments />
          </div>
        </div>
        {(v.designs || support) && <div class="workshop-tools v-p">
          {v.designs && <div class="workshop-stack"><Materials /></div>}
          {support && <WorkshopSupport research={research} farm={v.farm} />}
        </div>}
      </div>
    </div>
  );
}
