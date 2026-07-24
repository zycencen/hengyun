import { SubNavbar } from '@/components/shared/SubNavbar'

interface UserAgreementPageProps {
  onBack: () => void
}

export default function UserAgreementPage({ onBack }: UserAgreementPageProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <SubNavbar title="用户协议" onBack={onBack} />

      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="text-sm font-bold text-slate-800 mb-1">恒运出行用户服务协议</div>
          <div className="text-xs text-slate-400 mb-4">更新日期：2026年7月1日</div>

          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <section>
              <h3 className="font-semibold text-slate-700 mb-1">一、总则</h3>
              <p>1.1 欢迎使用恒运出行平台服务。本协议是您与恒运出行平台（以下简称"平台"）之间关于使用平台各项服务所订立的协议。</p>
              <p>1.2 您在使用平台服务前，请务必审慎阅读、充分理解本协议各条款内容。您使用平台服务的行为即视为您已阅读并同意接受本协议的约束。</p>
              <p>1.3 平台有权根据需要不时地修改本协议条款，修改后的协议一经公布即生效，并代替原来的协议。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">二、服务内容</h3>
              <p>2.1 平台为您提供包车出行、通勤班车、定制包车等用车服务的信息撮合与交易服务。</p>
              <p>2.2 平台作为第三方信息服务平台，本身不直接提供运输服务，实际运输服务由具备相应资质的运输服务提供方（以下简称"承运方"）提供。</p>
              <p>2.3 平台将根据您的出行需求，为您匹配合适的承运方和车辆资源。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">三、用户权利与义务</h3>
              <p>3.1 您有权根据自身需求选择适合的车型、套餐和服务时间。</p>
              <p>3.2 您应提供真实、准确、完整的个人信息和出行需求信息。</p>
              <p>3.3 您应按照约定的时间和地点乘车，如需变更或取消订单，应提前通知平台。</p>
              <p>3.4 您在乘车过程中应遵守相关法律法规，不得携带违禁品上车。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">四、订单与支付</h3>
              <p>4.1 您通过平台提交用车需求并支付费用后，订单即告成立。</p>
              <p>4.2 平台支持的支付方式包括但不限于微信支付、支付宝、对公转账等。</p>
              <p>4.3 订单取消及退款规则详见平台公示的退款政策。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">五、责任限制</h3>
              <p>5.1 平台作为信息服务平台，不对承运方的运输服务质量承担直接责任，但将协助您维护合法权益。</p>
              <p>5.2 因不可抗力因素导致的服务中断或取消，平台不承担责任。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">六、其他</h3>
              <p>6.1 本协议的解释、效力及争议解决，适用中华人民共和国法律。</p>
              <p>6.2 如您对本协议有任何疑问，请联系平台客服。</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
