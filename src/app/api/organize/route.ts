import { NextRequest, NextResponse } from "next/server";
import { checkOrganizeLimit, incrementOrganizeCount } from "@/lib/tiers";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个专业的笔记整理助手。请将以下口语化的、凌乱的会议/思考记录，整理成一份结构清晰的笔记。

You are a professional note organizer. Please organize the following conversational, messy meeting/thinking notes into a well-structured note.

关键规则 / Key Rule:
- 输出语言必须与输入语言一致。如果输入是英文，就用英文输出；如果是中文，就用中文输出。
- The output language MUST match the input language. Output in English if input is English, Chinese if input is Chinese, etc.

要求包含以下三个部分 / Required sections:

## 核心观点 / Core Ideas
- 提炼出 3-5 个最核心的观点或结论，每个用一两句话概括
- Extract 3-5 core ideas or conclusions, each summarized in 1-2 sentences

## 关键细节 / Key Details
- 补充支撑核心观点的具体细节、数据、例子
- Supporting details, data, and examples for the core ideas

## 后续行动项 / Action Items
- 列出需要执行的具体任务，每条可执行、可追踪
- List specific actionable tasks, each should be executable and trackable

使用 Markdown 格式输出，保持简洁有力。笔记应该让读者一眼就能抓住重点。
Use Markdown format. Keep it concise and impactful.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 DEEPSEEK_API_KEY 环境变量" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "请提供需要整理的文本内容" },
        { status: 400 }
      );
    }

    // Check organize limit for free users
    const limitCheck = await checkOrganizeLimit();
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "免费版整理次数已用完（3次）。",
          limitReached: true,
          tier: limitCheck.tier,
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    // Free tier: cap input to ~10 minutes of spoken text
    const MAX_FREE_CHARS = 10000;
    let truncatedText = text;
    let isTruncated = false;

    if (limitCheck.tier === "free" && text.length > MAX_FREE_CHARS) {
      truncatedText = text.slice(0, MAX_FREE_CHARS) + "\n\n[🔒 免费版仅整理前10分钟内容，升级Pro解锁全文]";
      isTruncated = true;
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: truncatedText },
        ],
        temperature: 0.5,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `AI 整理失败: DeepSeek 返回状态码 ${response.status}`,
          detail: errorText,
        },
        { status: 502 }
      );
    }

    const result = await response.json();
    const organizedText =
      result?.choices?.[0]?.message?.content || "未能生成整理结果";

    // Increment organize count
    await incrementOrganizeCount();

    return NextResponse.json({
      success: true,
      organized: organizedText,
      organizeRemaining: limitCheck.tier === "pro" ? Infinity : Math.max(0, limitCheck.remaining - 1),
      tier: limitCheck.tier,
      metadata: {
        model: result.model,
        usage: result.usage,
      },
    });
  } catch (error) {
    console.error("整理接口异常:", error);
    return NextResponse.json(
      {
        error:
          "服务器内部错误: " +
          (error instanceof Error ? error.message : "未知错误"),
      },
      { status: 500 }
    );
  }
}
